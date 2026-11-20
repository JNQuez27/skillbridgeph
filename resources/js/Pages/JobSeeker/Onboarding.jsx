import { useMemo, useState } from "react";
import { router } from "@inertiajs/react";
import AuthLayout from "./components/layout/AuthLayout";
import Button from "./components/ui/Button";
import Input from "./components/ui/Input";
import FlashBanner from "./components/ui/FlashBanner";
import { skillGroups, skillOptions } from "./data/jobSeekerData";

// Applicant profile setup in three steps (reference flow): skills, goals, proof.
const STEPS = [
  { title: "What are you great at?", subtitle: "Choose your field, then pick your skills. Each one starts as Pending until you verify it." },
  { title: "Where do you want to go?", subtitle: "Tell us what a great opportunity looks like." },
  { title: "Give your skills proof.", subtitle: "Upload a credential now, or verify a skill later." },
];
const SETUPS = ["Hybrid", "Remote", "On-site"];
const ISSUERS = [["tesda", "TESDA"], ["prc", "PRC"], ["other", "Other (school, course, employer)"]];

function Chip({ on, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={`min-h-9 rounded-full border px-3 text-xs font-semibold transition ${on ? "border-[#ECA406] bg-[#FFF3D6] text-neutral-900" : "border-neutral-200 bg-white text-neutral-700 hover:border-[#ECA406]"}`}>
      {on ? "✓ " : "+ "}{children}
    </button>
  );
}

export default function Onboarding({ suggestedSkills = [], profile = {} }) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [search, setSearch] = useState("");
  const [skills, setSkills] = useState(profile.skills || []);
  // The applicant picks a field first; only that field's skills are offered, so an IT
  // applicant never sees Barista and a cafe worker never sees Laravel.
  const [group, setGroup] = useState(() => {
    const own = (profile.skills || []).map((s) => s.toLowerCase());
    const best = skillGroups.map((g) => [g.name, g.skills.filter((s) => own.includes(s.toLowerCase())).length]).sort((a, b) => b[1] - a[1])[0];
    return best && best[1] > 0 ? best[0] : null;
  });
  const fieldSkills = useMemo(() => {
    const list = skillGroups.find((g) => g.name === group)?.skills || [];
    const hot = new Set(suggestedSkills.map((s) => s.toLowerCase()));
    return [...list].sort((a, b) => hot.has(b.toLowerCase()) - hot.has(a.toLowerCase())); // in-demand first
  }, [group, suggestedSkills]);
  const pickField = (name) => {
    const keep = skillGroups.find((g) => g.name === name).skills.map((s) => s.toLowerCase());
    const known = skillOptions.map((s) => s.toLowerCase());
    // Drop picks from the old field; typed-in custom skills stay.
    setSkills((prev) => prev.filter((s) => keep.includes(s.toLowerCase()) || !known.includes(s.toLowerCase())));
    setGroup(name);
    setSearch("");
  };
  const [goals, setGoals] = useState({
    desiredRole: profile.desiredRole || "", location: profile.location || "", workSetups: profile.workSetups || [],
    expectedSalary: profile.expectedSalary || "", availability: profile.availability || "",
  });
  const [proof, setProof] = useState({ file: null, issuer: "tesda", qualification: "", credentialId: "", consent: false });

  const has = (name) => skills.some((s) => s.toLowerCase() === name.toLowerCase());
  const toggleSkill = (name) => setSkills((prev) => (prev.some((s) => s.toLowerCase() === name.toLowerCase())
    ? prev.filter((s) => s.toLowerCase() !== name.toLowerCase()) : [...prev, name]));
  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? fieldSkills.filter((s) => s.toLowerCase().includes(q)) : fieldSkills;
  }, [search, fieldSkills]);
  const typed = search.trim().toLowerCase();
  // A skill that belongs to another field (e.g. Barista while in IT) can't be typed in either.
  const otherField = typed && !fieldSkills.some((s) => s.toLowerCase() === typed) && skillOptions.some((s) => s.toLowerCase() === typed);
  const canAddTyped = typed && !otherField && !has(search.trim()) && !suggestions.some((s) => s.toLowerCase() === typed);

  const go = (next) => { setErrors({}); setStep(next); window.scrollTo(0, 0); };

  // Steps 1-2 are saved together, so the profile is complete before the optional proof step.
  const saveProfile = () => {
    setBusy(true);
    router.put("/applicant-profile", {
      skills,
      desiredRoles: goals.desiredRole.trim() ? [goals.desiredRole.trim()] : [],
      location: goals.location.trim() || undefined,
      preferredWorkSetups: goals.workSetups,
      expectedSalary: goals.expectedSalary.trim() || null,
      availability: goals.availability.trim() || null,
    }, {
      preserveScroll: true,
      onSuccess: () => go(2),
      onError: (e) => { setErrors(e); if (e.skills) setStep(0); },
      onFinish: () => setBusy(false),
    });
  };

  const registry = proof.issuer === "other" ? null : proof.issuer;
  const uploadProof = () => {
    setBusy(true);
    router.post("/credentials", {
      type: "certificate",
      title: registry ? proof.qualification : (proof.qualification || proof.file?.name),
      file: proof.file,
      registry: registry || "",
      registryNumber: registry ? proof.credentialId : "",
      registryQualification: registry ? proof.qualification : "",
      registryConsent: registry ? proof.consent : false,
    }, {
      forceFormData: true,
      onSuccess: () => router.visit("/dashboard?tab=skills"),
      onError: setErrors,
      onFinish: () => setBusy(false),
    });
  };
  const proofReady = proof.file && (!registry || (proof.qualification.trim() && proof.credentialId.trim() && proof.consent));

  return (
    <AuthLayout eyebrow={null} title={STEPS[step].title} subtitle={STEPS[step].subtitle} top={
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Your profile / Step {step + 1} of 3</p>
        <div className="mt-3 grid grid-cols-3 gap-2" aria-hidden="true">
          {STEPS.map((_, i) => <span key={i} className={`h-1 rounded-full ${i <= step ? "bg-[#ECA406]" : "bg-neutral-200"}`} />)}
        </div>
      </div>
    }>
      <FlashBanner />

      {step === 0 && (
        <div className="flex flex-col gap-5">
          <div>
            <p className="mb-3 text-sm font-semibold text-neutral-900">What field do you work in?</p>
            <div role="radiogroup" aria-label="Your field" className="flex flex-wrap gap-2">
              {skillGroups.map((g) => (
                <button key={g.name} type="button" role="radio" aria-checked={group === g.name} onClick={() => pickField(g.name)}
                  className={`min-h-9 rounded-full px-3 text-xs font-bold transition ${group === g.name ? "bg-[#ECA406] text-white" : "bg-[#FFF6E0] text-neutral-900 hover:bg-[#FDF0D0]"}`}>
                  {g.name}
                </button>
              ))}
            </div>
          </div>
          {group && (
            <>
              <Input id="skill-search" label={`Find a skill in ${group}`} placeholder="Search skills, tools, or strengths" value={search}
                onChange={(e) => setSearch(e.target.value)} />
              <div>
                <p className="mb-3 text-sm font-semibold text-neutral-900">{search ? "Matching skills" : `${group} skills`}</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => <Chip key={s} on={has(s)} onClick={() => toggleSkill(s)}>{s}</Chip>)}
                  {canAddTyped && <Chip on={false} onClick={() => { toggleSkill(search.trim()); setSearch(""); }}>Add “{search.trim()}”</Chip>}
                </div>
                {otherField && <p className="mt-2 text-xs text-neutral-600">“{search.trim()}” belongs to another field. Change your field above to add it.</p>}
                {skills.filter((s) => !suggestions.some((x) => x.toLowerCase() === s.toLowerCase())).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {skills.filter((s) => !suggestions.some((x) => x.toLowerCase() === s.toLowerCase())).map((s) => <Chip key={s} on onClick={() => toggleSkill(s)}>{s}</Chip>)}
                  </div>
                )}
              </div>
            </>
          )}
          <div className="rounded-2xl bg-[#FFF6E0] p-5">
            <p className="font-display text-base font-bold text-neutral-900">{skills.length} skill{skills.length === 1 ? "" : "s"} selected</p>
            <p className="mt-1 text-xs text-neutral-700">New skills start as declared (Pending). Pass an assessment or have your work reviewed to turn them into verified badges.</p>
          </div>
          {errors.skills && <p role="alert" className="text-xs text-rose-600">{errors.skills}</p>}
          <Button type="button" className="w-fit px-6" disabled={skills.length === 0} onClick={() => go(1)}>Continue →</Button>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <Input id="goal-role" label="Desired role" placeholder="Customer Success Associate" value={goals.desiredRole}
            onChange={(e) => setGoals({ ...goals, desiredRole: e.target.value })} error={errors.desiredRoles} />
          <Input id="goal-location" label="Location" placeholder="Makati, Metro Manila" value={goals.location}
            onChange={(e) => setGoals({ ...goals, location: e.target.value })} error={errors.location} />
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-neutral-900">Work arrangement</legend>
            <div className="flex flex-wrap gap-2">
              {SETUPS.map((s) => (
                <Chip key={s} on={goals.workSetups.includes(s)}
                  onClick={() => setGoals((g) => ({ ...g, workSetups: g.workSetups.includes(s) ? g.workSetups.filter((x) => x !== s) : [...g.workSetups, s] }))}>{s}</Chip>
              ))}
            </div>
          </fieldset>
          <Input id="goal-salary" label="Expected monthly salary" placeholder="₱25,000 – ₱35,000" value={goals.expectedSalary}
            onChange={(e) => setGoals({ ...goals, expectedSalary: e.target.value })} error={errors.expectedSalary} />
          <Input id="goal-availability" label="Availability" placeholder="Ready within 30 days" value={goals.availability}
            onChange={(e) => setGoals({ ...goals, availability: e.target.value })} error={errors.availability} />
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => go(0)}>Back</Button>
            <Button type="button" className="px-6" loading={busy} disabled={busy} onClick={saveProfile}>Continue →</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <label className="flex cursor-pointer flex-col gap-2 rounded-2xl border-2 border-dashed border-[#ECA406] bg-[#FFF6E0] p-6 text-neutral-900">
            <span aria-hidden="true" className="text-xl font-bold">↑</span>
            <span className="font-display text-base font-bold">Add a certificate or credential</span>
            <span className="text-xs text-neutral-600">PDF, JPG, or PNG · up to 10 MB<br />TESDA, course certificates, or training records.</span>
            <span className="mt-2 w-fit rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold">Choose document</span>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only"
              onChange={(e) => setProof({ ...proof, file: e.target.files?.[0] || null })} />
          </label>
          {errors.file && <p role="alert" className="text-xs text-rose-600">{errors.file}</p>}

          {proof.file && (
            <>
              <div className="rounded-2xl border border-neutral-200 p-4">
                <p className="break-all text-sm font-semibold text-neutral-900">{proof.file.name}</p>
                <p className="mt-1 text-xs text-neutral-500">{(proof.file.size / 1048576).toFixed(1)} MB · Ready to submit</p>
              </div>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-semibold text-neutral-900">Issued by</span>
                <select value={proof.issuer} onChange={(e) => setProof({ ...proof, issuer: e.target.value })}
                  className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 focus:border-[#ECA406] focus:outline-none focus:ring-2 focus:ring-[#ECA406]/30">
                  {ISSUERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <Input id="proof-qualification" label={registry ? "Qualification" : "Certificate title"} placeholder={registry === "prc" ? "Registered Nurse" : "Customer Service NC II"}
                value={proof.qualification} onChange={(e) => setProof({ ...proof, qualification: e.target.value })}
                error={errors.registryQualification || errors.title} />
              {registry && (
                <>
                  <Input id="proof-id" label={registry === "prc" ? "License number" : "Certificate number"} placeholder="e.g. 2026-01482-0001"
                    value={proof.credentialId} onChange={(e) => setProof({ ...proof, credentialId: e.target.value })} error={errors.registryNumber} />
                  <label className="flex items-start gap-3 text-xs text-neutral-700">
                    <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#ECA406]" checked={proof.consent}
                      onChange={(e) => setProof({ ...proof, consent: e.target.checked })} />
                    <span>I agree that SkillBridge PH checks this number with the {registry.toUpperCase()} registry. Approved, it becomes a registry-verified badge.</span>
                  </label>
                </>
              )}
            </>
          )}

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onClick={() => go(1)}>Back</Button>
            <Button type="button" className="px-6" loading={busy} disabled={busy || !proofReady} onClick={uploadProof}>Submit and finish →</Button>
            <Button type="button" variant="ghost" onClick={() => router.visit("/dashboard?tab=skills")}>Skip, verify later</Button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
