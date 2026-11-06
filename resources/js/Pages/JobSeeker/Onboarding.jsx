import { useMemo, useState } from "react";
import { router } from "@inertiajs/react";
import Button from "./components/ui/Button";
import Card from "./components/ui/Card";
import Input from "./components/ui/Input";
import Badge from "./components/ui/Badge";
import ProgressBar from "./components/ui/ProgressBar";
import FlashBanner from "./components/ui/FlashBanner";
import { ToastProvider, useToast } from "./components/ui/ToastProvider";
import { skillOptions } from "./data/jobSeekerData";

const steps = [
  { key: "basic", title: "Basic Info" },
  { key: "skills", title: "Skills" },
  { key: "education", title: "Education" },
  { key: "experience", title: "Experience" },
  { key: "review", title: "Review" },
];

function OnboardingContent() {
  // Route is protected by `auth` middleware server-side, so no client guard needed.
  const { addToast } = useToast();
  const [stepIndex, setStepIndex] = useState(0);
  const [skillSearch, setSkillSearch] = useState("");
  const [customSkill, setCustomSkill] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    bio: "",
    location: "",
    desiredRoles: "",
    skills: [],
    education: { school: "", degree: "", year: "" },
    experience: { title: "", company: "", description: "" },
    experienceLevel: "",
  });

  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);

  const filteredSkills = useMemo(() => {
    return skillOptions.filter((skill) =>
      skill.toLowerCase().includes(skillSearch.toLowerCase())
    );
  }, [skillSearch]);

  const toggleSkill = (skill) => {
    setFormData((prev) => {
      const exists = prev.skills.includes(skill);
      return {
        ...prev,
        skills: exists
          ? prev.skills.filter((item) => item !== skill)
          : [...prev.skills, skill],
      };
    });
  };

  const addCustomSkill = () => {
    const trimmed = customSkill.trim();
    if (!trimmed) return;
    if (!formData.skills.includes(trimmed)) {
      setFormData((prev) => ({ ...prev, skills: [...prev.skills, trimmed] }));
    }
    setCustomSkill("");
  };

  const isStepValid = useMemo(() => {
    const { bio, skills, education, location, desiredRoles, experienceLevel } = formData;
    if (stepIndex === 0) return bio.length > 0 && bio.length <= 150 && location.trim().length > 0 && desiredRoles.trim().length > 0;
    if (stepIndex === 1) return skills.length > 0;
    if (stepIndex === 2) return education.school && education.degree && education.year;
    if (stepIndex === 3) return experienceLevel.trim().length > 0;
    return true;
  }, [formData, stepIndex]);

  const handleSubmit = () => {
    setSubmitting(true);
    // Everything collected here is saved. Skills are stored as self-reported;
    // they become verified only through an assessment or an employer's review.
    router.put(
      "/applicant-profile",
      {
        bio: formData.bio.trim(),
        location: formData.location.trim(),
        experienceLevel: formData.experienceLevel || undefined,
        headline: formData.experience.title.trim() || undefined,
        desiredRoles: formData.desiredRoles.split(",").map((r) => r.trim()).filter(Boolean),
        skills: formData.skills,
        education: formData.education,
        experience: formData.experience,
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          addToast({ message: "Profile saved. Next: verify your skills with the recommended assessments.", type: "success" });
          router.visit("/dashboard?tab=skills");
        },
        onError: (errors) => {
          const first = Object.values(errors || {})[0];
          addToast({ message: first || "Could not save your profile. Please review your answers.", type: "error" });
        },
        onFinish: () => setSubmitting(false),
      }
    );
  };

  return (
    <div className="min-h-screen bg-sky-50 px-4 py-8 font-sans text-slate-800">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.3em] text-sky-700">SkillBridge PH</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-sky-900">Applicant Onboarding</h1>
          <p className="mt-2 text-sm text-slate-500">Complete your profile to get matched with more opportunities.</p>
        </div>
        <FlashBanner />

        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Step {stepIndex + 1} of {steps.length}</p>
              <p className="text-xs text-slate-500">{steps[stepIndex].title}</p>
            </div>
            <div className="w-full max-w-xs">
              <ProgressBar value={progress} />
              <p className="mt-2 text-xs text-slate-500">{progress}% complete</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {steps.map((step, index) => (
              <Badge key={step.key} tone={index === stepIndex ? "info" : "default"}>
                {step.title}
              </Badge>
            ))}
          </div>
        </Card>

        {stepIndex === 0 && (
          <Card className="space-y-4">
            <Input
              id="onboard-bio"
              label="Short bio"
              placeholder="Tell recruiters about your strengths"
              value={formData.bio}
              onChange={(event) => setFormData((prev) => ({ ...prev, bio: event.target.value }))}
              hint={`${formData.bio.length}/150 characters`}
              error={formData.bio.length > 150 ? "Max 150 characters" : ""}
            />
            <Input
              id="onboard-location"
              label="Location"
              placeholder="City, Region"
              value={formData.location}
              onChange={(event) => setFormData((prev) => ({ ...prev, location: event.target.value }))}
            />
            <Input
              id="onboard-roles"
              label="Roles you want (comma-separated)"
              placeholder="Frontend Developer, Barista"
              value={formData.desiredRoles}
              onChange={(event) => setFormData((prev) => ({ ...prev, desiredRoles: event.target.value }))}
              hint="Matching jobs are flagged to your account automatically."
            />
          </Card>
        )}

        {stepIndex === 1 && (
          <Card className="space-y-4">
            <Input
              id="skill-search"
              label="Search skills"
              placeholder="Search skills"
              value={skillSearch}
              onChange={(event) => setSkillSearch(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {filteredSkills.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${formData.skills.includes(skill) ? "border-sky-400 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-600"}`}
                >
                  {skill}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Input
                id="custom-skill"
                label="Add custom skill"
                placeholder="e.g. Event styling"
                value={customSkill}
                onChange={(event) => setCustomSkill(event.target.value)}
              />
              <Button type="button" variant="secondary" onClick={addCustomSkill}>
                Add skill
              </Button>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900" role="note">
              <strong>Every skill you add is saved as Pending.</strong> It stays pending until you verify it, by passing an
              assessment or having your work reviewed. Employers see verified skills first.
            </div>
            {formData.skills.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-slate-800">Your skills ({formData.skills.length})</p>
                <ul className="mt-2 flex flex-wrap gap-2" aria-label="Skills you added">
                  {formData.skills.map((skill) => (
                    <li key={skill} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-3 pr-1 text-xs font-semibold text-slate-700">
                      {skill}
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">Pending</span>
                      <button type="button" onClick={() => toggleSkill(skill)} aria-label={`Remove ${skill}`}
                        className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100">×</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        )}

        {stepIndex === 2 && (
          <Card className="space-y-4">
            <Input
              id="education-school"
              label="School name"
              placeholder="University name"
              value={formData.education.school}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  education: { ...prev.education, school: event.target.value },
                }))
              }
            />
            <Input
              id="education-degree"
              label="Course or degree"
              placeholder="Course or degree"
              value={formData.education.degree}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  education: { ...prev.education, degree: event.target.value },
                }))
              }
            />
            <Input
              id="education-year"
              label="Year completed"
              placeholder="2025"
              value={formData.education.year}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  education: { ...prev.education, year: event.target.value },
                }))
              }
            />
          </Card>
        )}

        {stepIndex === 3 && (
          <Card className="space-y-4">
            <Input
              id="experience-title"
              label="Job title"
              placeholder="Sales Associate"
              value={formData.experience.title}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  experience: { ...prev.experience, title: event.target.value },
                }))
              }
            />
            <Input
              id="experience-company"
              label="Company name"
              placeholder="Company name"
              value={formData.experience.company}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  experience: { ...prev.experience, company: event.target.value },
                }))
              }
            />
            <Input
              id="experience-description"
              label="Description"
              placeholder="Highlight your key responsibilities"
              value={formData.experience.description}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  experience: { ...prev.experience, description: event.target.value },
                }))
              }
            />
            <label className="flex flex-col gap-2 text-sm text-slate-600">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Experience level</span>
              <select
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                value={formData.experienceLevel}
                onChange={(event) => setFormData((prev) => ({ ...prev, experienceLevel: event.target.value }))}
              >
                <option value="">Select level</option>
                <option value="Entry">Entry</option>
                <option value="Mid">Mid</option>
                <option value="Senior">Senior</option>
              </select>
            </label>
          </Card>
        )}

        {stepIndex === 4 && (
          <Card className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Basic Info</p>
                <p className="text-xs text-slate-500">{formData.bio}</p>
                <p className="mt-1 text-xs text-slate-500">{formData.location} · wants: {formData.desiredRoles}</p>
              </div>
              <Button type="button" variant="ghost" onClick={() => setStepIndex(0)}>
                Edit
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Skills</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.skills.map((skill) => (
                    <Badge key={skill} tone="info">{skill} · Pending</Badge>
                  ))}
                </div>
              </div>
              <Button type="button" variant="ghost" onClick={() => setStepIndex(1)}>
                Edit
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Education</p>
                <p className="text-xs text-slate-500">
                  {formData.education.school} - {formData.education.degree} ({formData.education.year})
                </p>
              </div>
              <Button type="button" variant="ghost" onClick={() => setStepIndex(2)}>
                Edit
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Experience</p>
                <p className="text-xs text-slate-500">{formData.experience.title || "Optional"}</p>
                <p className="mt-1 text-xs text-slate-500">Level: {formData.experienceLevel || "-"}</p>
              </div>
              <Button type="button" variant="ghost" onClick={() => setStepIndex(3)}>
                Edit
              </Button>
            </div>
            <p className="rounded-xl border border-sky-100 bg-sky-50/70 p-3 text-xs text-slate-600">
              Your skills are saved as <strong>self-reported</strong>. To get them verified, take a company
              assessment or upload evidence from your dashboard. Verified skills rank you higher with employers.
            </p>
          </Card>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="secondary"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}
          >
            Back
          </Button>
          {stepIndex < steps.length - 1 ? (
            <Button type="button" disabled={!isStepValid} onClick={() => setStepIndex((prev) => prev + 1)}>
              Continue
            </Button>
          ) : (
            <Button type="button" loading={submitting} onClick={handleSubmit}>
              Submit profile
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Onboarding() {
  return (
    <ToastProvider>
      <OnboardingContent />
    </ToastProvider>
  );
}
