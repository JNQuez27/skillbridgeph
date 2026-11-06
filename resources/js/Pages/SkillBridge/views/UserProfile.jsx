import { COLORS, FONT_DISPLAY, FONT_BODY } from "../styles/ui";
import { useMemo, useState } from "react";
import { router, useForm } from "@inertiajs/react";
import SkillBar from "../components/SkillBar";
import RegistryStatus from "../components/RegistryStatus";
import VideoRecorder from "../components/VideoRecorder";
import {
  IconCheck,
  IconStar,
  IconAward,
  IconBriefcase,
  IconPlus,
  IconMapPin,
  IconVideo,
  IconBuilding,
} from "../components/Icons";


const sectionMeta = {
  skills: { label: "Skills & Badges", sub: "Your verified proof of skill." },
  portfolio: { label: "Credentials & Portfolio", sub: "Upload CVs, certificates, portfolios, and hands-on demo videos." },
  matches: { label: "Job Matches", sub: "Jobs matched to you — pick the ones that fit." },
  badges: { label: "Badge Wallet", sub: "Your verified badges. Open one to see its proof and share a verification link." },
  applications: { label: "My Applications", sub: "Answer employer invitations and see where each application stands." },
  assessments: { label: "Assessments", sub: "Take a company assessment to verify a skill badge." },
  browse: { label: "Find Jobs", sub: "Search every open role and view your match." },
  companies: { label: "Companies", sub: "Browse the employers hiring on SkillBridge PH." },
  settings: { label: "Profile Settings", sub: "Tell us what work you want so matching stays accurate." },
};

const formatBytes = (bytes) => {
  if (!bytes) return "";
  const kb = bytes / 1024;
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
};

const cardStyle = { background: COLORS.cream, borderRadius: 14, padding: "22px 20px", border: `1px solid ${COLORS.parchmentDeep}` };
const headingStyle = { fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 600, color: COLORS.brownDeep, marginBottom: 14 };
const primaryBtn = { padding: "8px 14px", borderRadius: 8, background: COLORS.info, border: "none", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT_BODY };
const ghostBtn = { padding: "8px 14px", borderRadius: 8, background: "transparent", border: `1px solid ${COLORS.parchmentDeep}`, color: COLORS.brownDeep, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT_BODY };
const linkBtn = { border: "none", background: "none", padding: 0, color: COLORS.info, fontWeight: 600, cursor: "pointer", textDecoration: "underline", fontSize: "inherit", fontFamily: "inherit" };
const legendStyle = { fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 600, color: COLORS.brownDeep, padding: "0 6px" };
const inputStyle = { padding: "10px 12px", borderRadius: 10, border: `1px solid ${COLORS.parchmentDeep}`, background: COLORS.cream, fontSize: 13, color: COLORS.textDark, fontFamily: FONT_BODY };

export default function ProfileView({ account, activeTab = "skills", onTabChange = () => {} }) {
  const tab = sectionMeta[activeTab] ? activeTab : "skills";
  const profile = account?.profile || {};
  const skills = account?.skills || [];
  const credentials = account?.credentials || [];
  const matches = account?.matches || [];
  // Fig. 19 (1900): invitations (1914-1916) and the status tracker (1908).
  const myApplications = account?.applications || [];
  const invitations = myApplications.filter((a) => a.status === "invited");
  const tracked = myApplications.filter((a) => ["applied", "shortlisted", "interviewing", "hired", "not_selected"].includes(a.status));
  const declined = myApplications.filter((a) => a.status === "declined");
  const answerInvite = (inv, answer) => {
    if (answer === "decline" && !window.confirm(`Decline ${inv.company}'s invitation for ${inv.title}? They will be told and will not invite you to this job again. You can still apply yourself later.`)) return;
    router.post(`/applications/${inv.jobId}/answer`, { answer }, { preserveScroll: true });
  };
  const browse = account?.browse || [];
  const companies = account?.companies || [];
  const assessments = account?.assessments || [];

  const verifiedSkills = skills.filter((s) => s.verificationStatus === "verified");
  const pendingSkills = skills.filter((s) => !["verified", "unverified"].includes(s.verificationStatus));
  const unverifiedSkills = skills.filter((s) => s.verificationStatus === "unverified");
  // Every open assessment, keyed by the skill it verifies.
  const allAssessments = assessments.flatMap((c) => c.assessments.map((a) => ({ ...a, company: c.company })));
  const assessmentFor = (skill) => allAssessments.find((a) => (a.skill || "").toLowerCase() === skill.toLowerCase() && !a.verified && !a.attempts?.locked && !a.attempts?.nextAttemptAt && !a.attempts?.pending);
  const recommended = pendingSkills.map((sk) => ({ skill: sk.name, test: assessmentFor(sk.name) })).filter((r) => r.test);

  // Fig. 7, step 710: search plus filters (work setup, job type, city, minimum match).
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ workSetup: "", employmentType: "", city: "", minScore: 0 });
  const cityOf = (job) => (job.location || "").split(",")[0].trim();
  const filterOptions = useMemo(() => {
    const uniq = (fn) => [...new Set(browse.map(fn).filter(Boolean))].sort();
    return { workSetup: uniq((j) => j.workSetup), employmentType: uniq((j) => j.employmentType), city: uniq(cityOf) };
  }, [browse]);
  const filteredBrowse = useMemo(() => {
    const q = search.trim().toLowerCase();
    return browse.filter((j) =>
      (!q || `${j.title} ${j.company} ${(j.requiredSkills || []).join(" ")}`.toLowerCase().includes(q))
      && (!filters.workSetup || j.workSetup === filters.workSetup)
      && (!filters.employmentType || j.employmentType === filters.employmentType)
      && (!filters.city || cityOf(j) === filters.city)
      && j.score >= filters.minScore);
  }, [search, filters, browse]);
  const filtersActive = search || filters.workSetup || filters.employmentType || filters.city || filters.minScore;

  const upload = useForm({ type: "resume", title: "", file: null, registry: "", registryNumber: "", registryQualification: "", registryConsent: false, recordingId: null, linkedSkills: [] });
  // Fig. 20 (2022): skills a work sample can be linked to (ones the applicant holds).
  const linkableSkills = skills.filter((s) => s.verificationStatus !== "unverified").map((s) => s.name);
  const toggleIn = (list, name) => (list.includes(name) ? list.filter((n) => n !== name) : [...list, name]);
  const [editingLinks, setEditingLinks] = useState(null);   // { id, linkedSkills }
  const saveLinks = () => router.post(`/credentials/${editingLinks.id}/skills`, { linkedSkills: editingLinks.linkedSkills },
    { preserveScroll: true, onSuccess: () => setEditingLinks(null) });
  const submitCredential = (event) => {
    event.preventDefault();
    upload.post("/credentials", { forceFormData: true, preserveScroll: true, onSuccess: () => upload.reset("title", "file", "registry", "registryNumber", "registryQualification", "registryConsent", "recordingId", "linkedSkills") });
  };
  const deleteCredential = (id) => router.delete(`/credentials/${id}`, { preserveScroll: true });
  const pickJob = (jobId, status) => router.post(`/applications/${jobId}`, { status }, { preserveScroll: true });

  const list = (text) => text.split(",").map((r) => r.trim()).filter(Boolean);
  const settings = useForm({
    headline: profile.headline || "",
    bio: profile.bio || "",
    location: profile.location || "",
    experienceLevel: profile.experienceLevel || "Entry",
    desiredRoles: (profile.desiredRoles || []).join(", "),
    preferredWorkSetups: profile.preferredWorkSetups || [],
    preferredJobTypes: profile.preferredJobTypes || [],
    skills: pendingSkills.map((s) => s.name).join(", "),
    education: { school: "", degree: "", year: "", ...(profile.education || {}) },
    experience: { title: "", company: "", description: "", ...(profile.experience || {}) },
  });
  const submitSettings = (event) => {
    event.preventDefault();
    settings.transform((data) => ({
      ...data,
      desiredRoles: list(data.desiredRoles),
      skills: list(data.skills),
    })).put("/applicant-profile", { preserveScroll: true });
  };

  // Take-assessment (badge verification) flow. The server starts the clock and
  // only then sends the questions, so the modal is driven by server state: it is
  // open while an assessment is started, and closes once the attempt is scored.
  const [closedId, setClosedId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [taskAnswer, setTaskAnswer] = useState("");
  const [taskFile, setTaskFile] = useState(null);
  const activeAssessment = allAssessments.find((a) => a.started && ((a.questions || []).length > 0 || a.task) && a.id !== closedId) || null;
  const task = activeAssessment?.task;
  const canSubmit = activeAssessment && Object.keys(answers).length >= (activeAssessment.questions || []).length
    && (!task || ((taskAnswer.trim() || taskFile) && (!task.fileRequired || taskFile)));
  const startAssessment = (a) => {
    setClosedId(null);
    setAnswers({});
    setTaskAnswer("");
    setTaskFile(null);
    router.post(`/assessments/${a.id}/start`, {}, { preserveScroll: true, preserveState: true });
  };
  const submitAssessment = () => {
    router.post(`/assessments/${activeAssessment.id}/attempt`, { answers, taskAnswer, taskFile },
      { preserveScroll: true, forceFormData: !!taskFile });
  };

  const statusColor = (status) => ({ applied: "#15803D", shortlisted: "#15803D", interviewing: "#15803D", hired: "#15803D", invited: "#7C3AED", saved: "#0369A1", not_selected: "#475569" }[status] || "#B45309");

  return (
    <div className="sbph-applicant-page" style={{ padding: "28px 32px", fontFamily: FONT_BODY, background: COLORS.parchment, minHeight: "calc(100vh - 64px)" }}>
      {/* Profile header. On a phone (Fig. 21) it shows only on Profile, so the feed and wallet start at the top. */}
      <div className={`sbph-profile-hero${tab === "settings" ? " keep" : ""}`} style={{
        background: `linear-gradient(120deg, ${COLORS.brownDeep}, ${COLORS.brownMid})`,
        borderRadius: 18, padding: "28px 32px", marginBottom: 24,
        display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap",
        boxShadow: "0 20px 44px rgba(12, 74, 110, 0.22)",
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          background: `linear-gradient(135deg, ${COLORS.info}, ${COLORS.success})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 700, color: "#fff", flexShrink: 0,
          border: "3px solid rgba(255,255,255,0.25)",
        }}>{profile.initials || "U"}</div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 600, color: "#fff", marginBottom: 4 }}>{profile.name}</h2>
          <p style={{ color: "rgba(224,242,254,0.85)", fontSize: 13, marginBottom: 12 }}>{profile.headline}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {profile.stats?.badges > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(34,197,94,0.18)", color: COLORS.goldLight, padding: "4px 11px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                <IconCheck size={12} /> {profile.stats.badges} verified
              </span>
            )}
            {matches.length > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.12)", color: "#fff", padding: "4px 11px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                <IconStar size={12} /> {matches[0].score}% top match
              </span>
            )}
            {profile.location && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "rgba(224,242,254,0.8)", fontSize: 12 }}>
                <IconMapPin size={13} /> {profile.location}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {[[profile.stats?.badges ?? 0, "Badges"], [profile.stats?.applied ?? 0, "Applied"], [profile.stats?.matches ?? 0, "Matches"]].map(([v, l]) => (
            <div key={l} style={{ textAlign: "center", background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 16px", minWidth: 76 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: COLORS.goldLight, fontWeight: 700 }}>{v}</div>
              <div style={{ fontSize: 12, color: "rgba(224,242,254,0.7)" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Section heading (no icon) */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 600, color: COLORS.brownDeep }}>{sectionMeta[tab].label}</h1>
        <p style={{ fontSize: 12, color: COLORS.textLight }}>{sectionMeta[tab].sub}</p>
      </div>

      {/* Patent Fig. 3, step 345: recommend assessments for the skills still pending. */}
      {tab === "skills" && recommended.length > 0 && (
        <section aria-labelledby="rec-h" style={{ ...cardStyle, marginBottom: 22, borderColor: COLORS.info, display: "grid", gap: 10 }}>
          <h4 id="rec-h" style={{ ...headingStyle, marginBottom: 0 }}>Recommended assessments</h4>
          <p style={{ margin: 0, fontSize: 13, color: COLORS.textMid }}>These skills are still pending. Pass the assessment to turn each one into a verified badge.</p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
            {recommended.map(({ skill, test }) => (
              <li key={skill} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "10px 12px", borderRadius: 10, background: COLORS.parchment, border: `1px solid ${COLORS.parchmentDeep}` }}>
                <span style={{ fontSize: 13, color: COLORS.textDark }}>
                  <strong>{skill}</strong> · {test.title} by {test.company} · {test.questionCount} questions{test.hasTask ? " + practical task" : ""} · {test.durationMinutes} min · pass {test.passingScore}%
                </span>
                <button type="button" onClick={() => startAssessment(test)} style={{ ...primaryBtn, minHeight: 36 }}>Take assessment</button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {tab === "skills" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 22, alignItems: "start" }}>
          <div style={cardStyle}>
            <h4 style={headingStyle}>Your skills</h4>
            {skills.length === 0 && (
              <p style={{ fontSize: 13, color: COLORS.textLight, margin: 0 }}>
                No skills yet. Add the skills you have in <button type="button" onClick={() => onTabChange("settings")} style={linkBtn}>Settings</button>,
                then verify them. Employers see verified skills first.
              </p>
            )}
            {[...verifiedSkills, ...pendingSkills, ...unverifiedSkills].map((s) => {
              const test = s.verificationStatus === "verified" ? null : assessmentFor(s.name);
              return (
                <SkillBar key={s.name} skill={s} action={["verified", "unverified"].includes(s.verificationStatus) ? null : test
                  ? <button type="button" onClick={() => startAssessment(test)} style={{ ...primaryBtn, padding: "6px 10px" }}>Take assessment</button>
                  : <button type="button" onClick={() => onTabChange("portfolio")} style={{ ...ghostBtn, padding: "6px 10px" }}>Add evidence</button>} />
              );
            })}
          </div>
          <div style={{ display: "grid", gap: 16 }}>
            <div style={cardStyle}>
              <h4 style={headingStyle}>Earned badges</h4>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {verifiedSkills.map((s) => (
                  <div key={s.name} style={{ background: `linear-gradient(135deg, ${COLORS.brownMid}, ${COLORS.info})`, borderRadius: 14, padding: "14px", textAlign: "center", minWidth: 120, flex: "1 1 120px", color: "#fff" }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 6, color: COLORS.goldLight }}><IconAward size={24} /></div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{s.badge || `${s.name} Verified`}</div>
                    <div style={{ fontSize: 12, color: "rgba(224,242,254,0.85)", marginTop: 2 }}>{s.verifiedBy ? `by ${s.verifiedBy}` : s.name}</div>
                    {s.verificationId && <div style={{ fontSize: 12, marginTop: 6, fontFamily: "ui-monospace, Consolas, monospace", letterSpacing: "0.04em", color: "#fff" }}>{s.verificationId}</div>}
                  </div>
                ))}
                {verifiedSkills.length === 0 && <p style={{ fontSize: 12, color: COLORS.textLight, margin: 0 }}>No badges yet. Each one is issued by a verified company; none can be typed in.</p>}
              </div>
            </div>
            <div style={cardStyle}>
              <h4 style={headingStyle}>How a skill gets verified</h4>
              <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8, fontSize: 13, color: COLORS.textMid, lineHeight: 1.5 }}>
                <li><strong>Pass a timed assessment</strong> from a verified company. Questions appear only when the clock starts. You get 3 attempts, 24 hours apart; if all 3 fail, the skill is marked Unverified.</li>
                <li><strong>Or upload evidence</strong> (portfolio, certificate, demo video) and apply. The verified employer who reviews it can confirm the skill, and the badge names them and the file.</li>
              </ol>
              <p style={{ fontSize: 12, color: COLORS.textLight, margin: "10px 0 0" }}>
                {pendingSkills.length} self-reported skill(s) still count toward matches, at a lower weight than verified ones.
              </p>
            </div>
          </div>
        </div>
      )}

      {tab === "portfolio" && (
        <div style={{ display: "grid", gap: 20 }}>
          <form onSubmit={submitCredential} style={{ ...cardStyle, display: "grid", gap: 14 }}>
            <h4 style={{ ...headingStyle, marginBottom: 0 }}>Upload a credential</h4>
            <p style={{ fontSize: 12, color: COLORS.textLight, margin: 0 }}>
              IT roles: portfolio or CV. Barista / hiring-chief roles: a hands-on demo video. Certificates and resumes welcome too.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Type</span>
                <select value={upload.data.type} onChange={(e) => upload.setData("type", e.target.value)} style={inputStyle}>
                  <option value="resume">Resume / CV</option>
                  <option value="certificate">Certificate</option>
                  <option value="portfolio">Portfolio</option>
                  <option value="video">Hands-on demo video</option>
                </select>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Title (optional)</span>
                <input type="text" value={upload.data.title} placeholder="e.g. Barista latte-art demo" onChange={(e) => upload.setData("title", e.target.value)} style={inputStyle} />
              </label>
              {upload.data.type !== "video" && (
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>File (PDF/DOC/image up to 10MB)</span>
                  <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={(e) => upload.setData("file", e.target.files[0])} style={{ ...inputStyle, padding: "8px 10px", fontSize: 12 }} />
                </label>
              )}
            </div>
            {upload.data.type === "video" && (
              <div style={{ background: COLORS.parchment, border: `1px solid ${COLORS.parchmentDeep}`, borderRadius: 10, padding: "12px 14px", display: "grid", gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.brownDeep }}>Record your hands-on demo here</div>
                <div style={{ fontSize: 12, color: COLORS.textLight }}>
                  Videos are recorded in SkillBridge, not uploaded from a file. While you demonstrate the task, prompts appear at
                  random moments: say the codes out loud and do the action shown. A video made earlier, edited, or generated by AI
                  cannot contain prompts nobody knew in advance. Employers will also ask you to repeat part of the task live in your interview.
                </div>
                <VideoRecorder onRecorded={(file, recordingId) => upload.setData((d) => ({ ...d, file, recordingId }))} />
              </div>
            )}
            {upload.data.type === "portfolio" && (
              <fieldset style={{ background: COLORS.parchment, border: `1px solid ${COLORS.parchmentDeep}`, borderRadius: 10, padding: "12px 14px", display: "grid", gap: 8, margin: 0 }}>
                <legend style={{ fontSize: 12, fontWeight: 700, color: COLORS.brownDeep, padding: "0 4px" }}>Which of your skills does this work show?</legend>
                {linkableSkills.length === 0 ? (
                  <span style={{ fontSize: 12, color: COLORS.textLight }}>Add your skills in Settings first, then link this work sample to them.</span>
                ) : (
                  <SkillPicker options={linkableSkills} value={upload.data.linkedSkills} onToggle={(n) => upload.setData("linkedSkills", toggleIn(upload.data.linkedSkills, n))} />
                )}
                <span style={{ fontSize: 12, color: COLORS.textLight }}>A linked work sample counts as evidence: the skill counts 80% in your match instead of 60%. Verify it for 100%.</span>
              </fieldset>
            )}
            {upload.data.type === "certificate" && (
              <div style={{ background: COLORS.parchment, border: `1px solid ${COLORS.parchmentDeep}`, borderRadius: 10, padding: "12px 14px", display: "grid", gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.brownDeep }}>Get it checked against the official registry (optional)</div>
                <div style={{ fontSize: 12, color: COLORS.textLight }}>
                  A SkillBridge PH admin looks it up once under <strong>the name on your account</strong>. If it matches, it becomes a
                  registry-verified badge every employer can see, with no need for each of them to check it again.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Issued by</span>
                    <select value={upload.data.registry} onChange={(e) => upload.setData("registry", e.target.value)} style={inputStyle}>
                      <option value="">Don&apos;t check (stays self-reported)</option>
                      <option value="tesda">TESDA National Certificate (NC)</option>
                      <option value="prc">PRC professional license</option>
                    </select>
                  </label>
                  {upload.data.registry && (
                    <>
                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>{upload.data.registry === "tesda" ? "Certificate number" : "License number"}</span>
                        <input value={upload.data.registryNumber} onChange={(e) => upload.setData("registryNumber", e.target.value)} placeholder={upload.data.registry === "tesda" ? "e.g. 1234 5678 9012 3456" : "e.g. 0123456"} style={inputStyle} />
                        {upload.errors.registryNumber && <span role="alert" style={{ fontSize: 12, color: "#DC2626" }}>{upload.errors.registryNumber}</span>}
                      </label>
                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>{upload.data.registry === "tesda" ? "Qualification" : "Profession"}</span>
                        <input value={upload.data.registryQualification} onChange={(e) => upload.setData("registryQualification", e.target.value)} placeholder={upload.data.registry === "tesda" ? "e.g. Barista NC II" : "e.g. Registered Nurse"} style={inputStyle} />
                        {upload.errors.registryQualification && <span role="alert" style={{ fontSize: 12, color: "#DC2626" }}>{upload.errors.registryQualification}</span>}
                      </label>
                    </>
                  )}
                </div>
                {upload.data.registry && (
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: COLORS.textDark }}>
                    <input type="checkbox" checked={upload.data.registryConsent} onChange={(e) => upload.setData("registryConsent", e.target.checked)} style={{ marginTop: 2 }} />
                    <span>
                      I agree that SkillBridge PH may search the {upload.data.registry === "tesda" ? "TESDA" : "PRC"} registry with my name and this number to confirm it.{" "}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: COLORS.info, fontWeight: 600 }}>Privacy Notice</a>
                    </span>
                  </label>
                )}
                {upload.errors.registryConsent && <span role="alert" style={{ fontSize: 12, color: "#DC2626" }}>Tick the consent box to send this certificate for a registry check.</span>}
              </div>
            )}
            {upload.errors.file && <span style={{ fontSize: 12, color: "#DC2626" }}>{upload.errors.file}</span>}
            <div>
              <button type="submit" disabled={upload.processing || !upload.data.file} style={{ ...primaryBtn, opacity: upload.processing || !upload.data.file ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <IconPlus size={14} /> {upload.processing ? "Uploading…" : "Upload credential"}
              </button>
            </div>
          </form>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {credentials.length === 0 && <p style={{ fontSize: 13, color: COLORS.textLight }}>No credentials uploaded yet.</p>}
            {credentials.map((c) => {
              const isVideo = c.type === "video" || (c.mime || "").startsWith("video");
              return (
                <div key={c.id} style={{ ...cardStyle, display: "grid", gap: 8, padding: 0, overflow: "hidden" }}>
                  {isVideo ? (
                    <video src={c.url} controls style={{ width: "100%", height: 150, background: "#000", objectFit: "cover" }} />
                  ) : (
                    <div style={{ height: 90, background: `linear-gradient(135deg, ${COLORS.brownMid}, ${COLORS.info})`, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.9)" }}>
                      <IconBriefcase size={30} />
                    </div>
                  )}
                  <div style={{ padding: "0 16px 16px", display: "grid", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: COLORS.brownLight }}>
                      {isVideo ? <IconVideo size={15} /> : <IconBriefcase size={14} />}
                      <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: COLORS.textLight }}>{c.type}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.brownDeep, wordBreak: "break-word" }}>{c.title}</div>
                    <div style={{ fontSize: 12, color: COLORS.textLight }}>{c.originalName} · {formatBytes(c.size)}</div>
                    {c.duplicate && (
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#B45309", background: "rgba(180,83,9,0.10)", borderRadius: 6, padding: "4px 8px" }}>
                        This exact file was also uploaded by another account
                      </div>
                    )}
                    <RegistryStatus registry={c.registry} />
                    {c.recording && (
                      <div style={{ fontSize: 12, color: COLORS.textMid }}>Recorded in SkillBridge with {c.recording.prompts.length} live prompts</div>
                    )}
                    {c.type === "portfolio" && (editingLinks?.id === c.id ? (
                      <div style={{ display: "grid", gap: 6 }}>
                        <SkillPicker options={linkableSkills} value={editingLinks.linkedSkills} onToggle={(n) => setEditingLinks({ ...editingLinks, linkedSkills: toggleIn(editingLinks.linkedSkills, n) })} />
                        <div style={{ display: "flex", gap: 6 }}>
                          <button type="button" style={{ ...ghostBtn, padding: "4px 10px" }} onClick={() => setEditingLinks(null)}>Cancel</button>
                          <button type="button" style={{ ...primaryBtn, padding: "4px 10px" }} onClick={saveLinks}>Save skills</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: COLORS.textMid, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <span>Shows:</span>
                        {(c.linkedSkills || []).length === 0 ? <span style={{ color: COLORS.textLight }}>no skills linked</span>
                          : c.linkedSkills.map((n) => <span key={n} style={{ padding: "2px 8px", borderRadius: 999, background: "#E0F2FE", color: "#075985", fontWeight: 600 }}>{n}</span>)}
                        <button type="button" style={{ ...ghostBtn, padding: "2px 8px", minHeight: 28 }} onClick={() => setEditingLinks({ id: c.id, linkedSkills: c.linkedSkills || [] })}>Edit skills</button>
                      </div>
                    ))}
                    {(c.extractedSkills || []).length > 0 && (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {c.extractedSkills.slice(0, 6).map((s) => (
                          <span key={s} style={{ padding: "2px 7px", borderRadius: 999, background: COLORS.parchmentDark, fontSize: 12, color: COLORS.brownMid }}>{s}</span>
                        ))}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <a href={c.url} target="_blank" rel="noreferrer" style={{ ...primaryBtn, textDecoration: "none", padding: "6px 12px" }}>View</a>
                      <button onClick={() => deleteCredential(c.id)} style={{ ...ghostBtn, color: "#B91C1C", padding: "6px 12px" }}>Remove</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "badges" && <BadgeWallet badges={verifiedSkills} onFindJobs={() => onTabChange("browse")} />}

      {tab === "applications" && (
        <div style={{ display: "grid", gap: 22 }}>
          <section aria-labelledby="inv-h" style={{ display: "grid", gap: 10 }}>
            <h3 id="inv-h" style={{ margin: 0, fontSize: 16, color: COLORS.brownDeep, fontFamily: FONT_DISPLAY }}>Invitations ({invitations.length})</h3>
            {invitations.length === 0 ? (
              <div style={{ ...cardStyle, borderStyle: "dashed", fontSize: 13, color: COLORS.textMid }}>No invitations right now. Employers invite candidates whose verified skills fit their roles.</div>
            ) : invitations.map((inv) => (
              <div key={inv.jobId} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", borderColor: "#C4B5FD" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.brownDeep }}>{inv.title}</div>
                  <div style={{ fontSize: 12, color: COLORS.textMid, marginTop: 3 }}>{[inv.company, inv.location].filter(Boolean).join(" · ")} · invited {inv.updatedAt}{inv.score != null ? ` · ${inv.score}% match` : ""}</div>
                  <div style={{ fontSize: 12, color: COLORS.textLight, marginTop: 4 }}>Accepting sends your application with your verified badges and portfolio. No resume needed.</div>
                </div>
                {inv.jobOpen ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" style={{ ...ghostBtn, minHeight: 40 }} onClick={() => answerInvite(inv, "decline")}>Decline</button>
                    <button type="button" style={{ ...primaryBtn, minHeight: 40 }} onClick={() => answerInvite(inv, "accept")}>Accept and apply</button>
                  </div>
                ) : <span style={{ fontSize: 12, color: COLORS.textLight }}>This job has closed.</span>}
              </div>
            ))}
          </section>

          <section aria-labelledby="track-h" style={{ display: "grid", gap: 10 }}>
            <h3 id="track-h" style={{ margin: 0, fontSize: 16, color: COLORS.brownDeep, fontFamily: FONT_DISPLAY }}>Your applications ({tracked.length})</h3>
            {tracked.length === 0 ? (
              <div style={{ ...cardStyle, borderStyle: "dashed", fontSize: 13, color: COLORS.textMid }}>You have not applied yet. Find a job in Find Jobs or Matches, or accept an invitation above.</div>
            ) : tracked.map((app) => <StatusTracker key={app.jobId} app={app} />)}
          </section>

          {declined.length > 0 && (
            <section aria-labelledby="dec-h" style={{ display: "grid", gap: 8 }}>
              <h3 id="dec-h" style={{ margin: 0, fontSize: 14, color: COLORS.textMid }}>Invitations you declined</h3>
              {declined.map((d) => (
                <div key={d.jobId} style={{ ...cardStyle, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", fontSize: 13, color: COLORS.textMid }}>
                  <span><strong style={{ color: COLORS.brownDeep }}>{d.title}</strong> · {d.company} · declined {d.updatedAt}</span>
                  {d.jobOpen && <button type="button" style={ghostBtn} onClick={() => pickJob(d.jobId, "applied")}>Changed your mind? Apply</button>}
                </div>
              ))}
            </section>
          )}
        </div>
      )}

      {tab === "matches" && (
        <div style={{ display: "grid", gap: 12 }}>
          {matches.length === 0 ? (
            <div style={{ ...cardStyle, borderStyle: "dashed", fontSize: 13, color: COLORS.textMid }}>No matched jobs yet. Add verified skills and credentials to unlock recommendations.</div>
          ) : matches.map((job) => (
            <JobRow key={job.id} job={job} onApply={() => pickJob(job.id, "applied")} onSave={() => pickJob(job.id, "saved")} statusColor={statusColor} onOpenAssessments={() => onTabChange("assessments")} />
          ))}
        </div>
      )}

      {tab === "browse" && (
        <div style={{ display: "grid", gap: 12 }}>
          <div role="search" style={{ ...cardStyle, padding: "16px 18px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <label style={{ display: "grid", gap: 4, fontSize: 12, fontWeight: 600, color: COLORS.textMid, flex: "2 1 240px" }}>
              Search
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Title, company, or skill" style={inputStyle} />
            </label>
            {[["workSetup", "Work setup"], ["employmentType", "Job type"], ["city", "City"]].map(([key, label]) => (
              <label key={key} style={{ display: "grid", gap: 4, fontSize: 12, fontWeight: 600, color: COLORS.textMid, flex: "1 1 140px" }}>
                {label}
                <select value={filters[key]} onChange={(e) => setFilters({ ...filters, [key]: e.target.value })} style={inputStyle}>
                  <option value="">Any</option>
                  {filterOptions[key].map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
            ))}
            <label style={{ display: "grid", gap: 4, fontSize: 12, fontWeight: 600, color: COLORS.textMid, flex: "1 1 140px" }}>
              Minimum match
              <select value={filters.minScore} onChange={(e) => setFilters({ ...filters, minScore: Number(e.target.value) })} style={inputStyle}>
                {[0, 40, 60, 80].map((n) => <option key={n} value={n}>{n ? `${n}% or more` : "Any"}</option>)}
              </select>
            </label>
            {filtersActive ? (
              <button type="button" style={{ ...ghostBtn, minHeight: 40 }} onClick={() => { setSearch(""); setFilters({ workSetup: "", employmentType: "", city: "", minScore: 0 }); }}>Clear</button>
            ) : null}
          </div>
          <p style={{ margin: 0, fontSize: 12, color: COLORS.textLight }} aria-live="polite">
            {filteredBrowse.length} of {browse.length} open job(s), sorted by your match, highest first. When you apply, your verified badges and portfolio go with it. No resume needed.
          </p>
          {filteredBrowse.length === 0 ? (
            <div style={{ ...cardStyle, borderStyle: "dashed", fontSize: 13, color: COLORS.textMid }}>No jobs match these filters.</div>
          ) : filteredBrowse.map((job) => (
            <JobRow key={job.id} job={{ ...job, status: job.status || "open" }} onApply={() => pickJob(job.id, "applied")} onSave={() => pickJob(job.id, "saved")} statusColor={statusColor} hideStatusIfOpen onOpenAssessments={() => onTabChange("assessments")} />
          ))}
        </div>
      )}

      {tab === "companies" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))", gap: 16 }}>
          {companies.length === 0 && <p style={{ fontSize: 13, color: COLORS.textLight }}>No companies yet.</p>}
          {companies.map((c) => (
            <div key={c.id} style={{ ...cardStyle, display: "grid", gap: 12, alignContent: "start" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 42, height: 42, borderRadius: 10, background: COLORS.parchmentDark, color: COLORS.brownLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><IconBuilding size={21} /></span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.brownDeep, display: "flex", alignItems: "center", gap: 6 }}>
                    {c.name} {c.verified && <IconCheck size={13} color={COLORS.success} />}
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.textLight }}>{c.industry}</div>
                </div>
              </div>

              {/* company detail rows */}
              <div style={{ display: "grid", gap: 4, fontSize: 12, color: COLORS.textMid }}>
                {c.location && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><IconMapPin size={13} /> {c.location}</div>}
                {c.size && <div>{c.size} employees</div>}
                {c.recruiter && <div>Recruiter: {c.recruiter}{c.recruiterPosition ? ` · ${c.recruiterPosition}` : ""}</div>}
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{ padding: "3px 9px", borderRadius: 999, background: COLORS.parchment, border: `1px solid ${COLORS.parchmentDeep}`, fontSize: 12, fontWeight: 600, color: COLORS.info }}>{c.openRoles} open role(s)</span>
                {c.assessments > 0 && <span style={{ padding: "3px 9px", borderRadius: 999, background: COLORS.parchment, border: `1px solid ${COLORS.parchmentDeep}`, fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>{c.assessments} assessment(s)</span>}
                {c.verified && <span style={{ padding: "3px 9px", borderRadius: 999, background: "rgba(22,163,74,0.12)", fontSize: 12, fontWeight: 700, color: COLORS.success }}>Verified</span>}
              </div>

              {/* the employer's open roles, scored for this applicant */}
              {(c.roles || []).length > 0 && (
                <div style={{ display: "grid", gap: 8, borderTop: `1px solid ${COLORS.parchmentDeep}`, paddingTop: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: COLORS.textLight }}>Open roles</div>
                  {(c.roles || []).map((r) => (
                    <div key={r.id} style={{ background: COLORS.parchment, border: `1px solid ${COLORS.parchmentDeep}`, borderRadius: 10, padding: "10px 12px", display: "grid", gap: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.brownDeep }}>{r.title}</div>
                        <div style={{ textAlign: "center", flexShrink: 0 }}>
                          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 600, color: r.score >= 85 ? COLORS.success : COLORS.info }}>{r.score}%</div>
                          <div style={{ fontSize: 12, color: COLORS.textLight }}>match</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: COLORS.textLight }}>
                        {[r.employmentType, r.workSetup, r.salaryRange].filter(Boolean).join(" · ")}
                      </div>
                      {(r.requiredSkills || []).length > 0 && (
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {(r.requiredSkills || []).slice(0, 4).map((s) => (
                            <span key={s} style={{ padding: "2px 7px", borderRadius: 999, background: COLORS.cream, border: `1px solid ${COLORS.parchmentDeep}`, fontSize: 12, color: COLORS.textMid }}>{s}</span>
                          ))}
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button onClick={() => pickJob(r.id, "applied")} disabled={r.status === "applied"} style={{ ...primaryBtn, padding: "5px 11px", opacity: r.status === "applied" ? 0.6 : 1 }}>
                          {r.status === "applied" ? "Applied" : "Apply"}
                        </button>
                        {r.status && r.status !== "applied" && (
                          <span style={{ fontSize: 12, fontWeight: 700, textTransform: "capitalize", color: statusColor(r.status) }}>{r.status}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "assessments" && (
        <div style={{ display: "grid", gap: 16 }}>
          {assessments.length === 0 && <div style={{ ...cardStyle, borderStyle: "dashed", fontSize: 13, color: COLORS.textMid }}>No assessments available yet.</div>}
          {assessments.map((company) => (
            <div key={company.company} style={{ ...cardStyle, display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.brownDeep }}>{company.company}</div>
                  <div style={{ fontSize: 12, color: COLORS.textLight, marginTop: 4 }}>{company.industry} · {company.location}</div>
                </div>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {company.assessments.map((a) => (
                  <div key={a.id} style={{ borderRadius: 12, border: `1px solid ${COLORS.parchmentDeep}`, background: COLORS.parchment, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.brownDeep }}>{a.title}</div>
                      <div style={{ fontSize: 12, color: COLORS.textMid, marginTop: 2 }}>{a.questionCount} questions{a.hasTask ? " + practical task" : ""} · {a.durationMinutes} min · Pass {a.passingScore}% · Verifies <strong>{a.skill}</strong></div>
                      {a.lastFeedback && !a.verified && (
                        <div style={{ fontSize: 12, color: COLORS.textMid, marginTop: 4 }}><strong>Feedback on your task:</strong> {a.lastFeedback}</div>
                      )}
                      {!a.verified && a.attempts && (
                        <div style={{ fontSize: 12, color: COLORS.textMid, marginTop: 4 }}>
                          {a.attempts.locked
                            ? `All ${a.attempts.max} attempts used`
                            : `${a.attempts.left} of ${a.attempts.max} attempts left`}
                        </div>
                      )}
                    </div>
                    {a.verified ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: COLORS.success, fontSize: 12, fontWeight: 700 }}><IconCheck size={14} /> Verified</span>
                    ) : a.attempts?.pending ? (
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#075985", background: COLORS.parchmentDark, padding: "6px 10px", borderRadius: 8 }}>Task submitted · waiting for {company.company} to score it</span>
                    ) : a.attempts?.locked ? (
                      <span style={{ padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: "#FEE2E2", color: "#B91C1C" }}>Unverified</span>
                    ) : a.attempts?.nextAttemptAt && !a.started ? (
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#92400E", background: "rgba(180,83,9,0.10)", padding: "6px 10px", borderRadius: 8 }}>Next attempt opens {a.attempts.nextAttemptAt}</span>
                    ) : a.started ? (
                      <button onClick={() => setClosedId(null)} style={primaryBtn}>Resume (timer running)</button>
                    ) : (
                      <button onClick={() => startAssessment(a)} style={primaryBtn}>Start assessment</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "settings" && (
        <form onSubmit={submitSettings} style={{ display: "grid", gap: 18, maxWidth: 760 }}>
          <fieldset style={{ ...cardStyle, display: "grid", gap: 14, margin: 0 }}>
            <legend style={legendStyle}>What you want</legend>
            <Labeled label="Headline" error={settings.errors.headline}>
              <input type="text" value={settings.data.headline} onChange={(e) => settings.setData("headline", e.target.value)} placeholder="e.g. WordPress & Webflow Developer" style={inputStyle} />
            </Labeled>
            <Labeled label="Desired roles (comma-separated)" hint="Matching flags jobs like these to your account automatically.">
              <input type="text" value={settings.data.desiredRoles} onChange={(e) => settings.setData("desiredRoles", e.target.value)} placeholder="Frontend Developer, WordPress Developer" style={inputStyle} />
            </Labeled>
            <PreferencePicker label="Work setups I want" hint="Leave all unticked for any." options={["On-site", "Hybrid", "Remote"]}
              value={settings.data.preferredWorkSetups} onChange={(v) => settings.setData("preferredWorkSetups", v)} />
            <PreferencePicker label="Job types I want" hint="Leave all unticked for any." options={["Full-time", "Part-time", "Contract", "Internship"]}
              value={settings.data.preferredJobTypes} onChange={(v) => settings.setData("preferredJobTypes", v)} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              <Labeled label="Location" error={settings.errors.location}>
                <input type="text" value={settings.data.location} onChange={(e) => settings.setData("location", e.target.value)} placeholder="Davao City" style={inputStyle} />
              </Labeled>
              <Labeled label="Experience level">
                <select value={settings.data.experienceLevel} onChange={(e) => settings.setData("experienceLevel", e.target.value)} style={inputStyle}>
                  <option>Entry</option><option>Mid</option><option>Senior</option>
                </select>
              </Labeled>
            </div>
          </fieldset>

          <fieldset style={{ ...cardStyle, display: "grid", gap: 14, margin: 0 }}>
            <legend style={legendStyle}>Skills</legend>
            <Labeled label="Self-reported skills (comma-separated)" error={settings.errors.skills}
              hint={`Verified skills (${verifiedSkills.map((s) => s.name).join(", ") || "none yet"}) are kept automatically and cannot be edited here.`}>
              <input type="text" value={settings.data.skills} onChange={(e) => settings.setData("skills", e.target.value)} placeholder="React, Customer Service, Excel" style={inputStyle} />
            </Labeled>
          </fieldset>

          <fieldset style={{ ...cardStyle, display: "grid", gap: 14, margin: 0 }}>
            <legend style={legendStyle}>Background (self-reported)</legend>
            <Labeled label="Short bio">
              <textarea rows={3} value={settings.data.bio} onChange={(e) => settings.setData("bio", e.target.value)} style={{ ...inputStyle, resize: "vertical" }} />
            </Labeled>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <Labeled label="School"><input type="text" value={settings.data.education.school} onChange={(e) => settings.setData("education", { ...settings.data.education, school: e.target.value })} style={inputStyle} /></Labeled>
              <Labeled label="Course / degree"><input type="text" value={settings.data.education.degree} onChange={(e) => settings.setData("education", { ...settings.data.education, degree: e.target.value })} style={inputStyle} /></Labeled>
              <Labeled label="Year"><input type="text" inputMode="numeric" value={settings.data.education.year} onChange={(e) => settings.setData("education", { ...settings.data.education, year: e.target.value })} style={inputStyle} /></Labeled>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <Labeled label="Latest job title"><input type="text" value={settings.data.experience.title} onChange={(e) => settings.setData("experience", { ...settings.data.experience, title: e.target.value })} style={inputStyle} /></Labeled>
              <Labeled label="Company"><input type="text" value={settings.data.experience.company} onChange={(e) => settings.setData("experience", { ...settings.data.experience, company: e.target.value })} style={inputStyle} /></Labeled>
            </div>
          </fieldset>

          <div>
            <button type="submit" disabled={settings.processing} style={{ ...primaryBtn, padding: "10px 18px", opacity: settings.processing ? 0.6 : 1 }}>
              {settings.processing ? "Saving…" : "Save profile"}
            </button>
          </div>
        </form>
      )}

      {/* Take-assessment modal */}
      {activeAssessment && (
        <div role="dialog" aria-modal="true" aria-label={activeAssessment.title} style={{ position: "fixed", inset: 0, background: "rgba(12,74,110,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 60 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: COLORS.cream, borderRadius: 16, padding: "22px 24px", width: "min(620px, 100%)", maxHeight: "86vh", overflowY: "auto", border: `1px solid ${COLORS.parchmentDeep}`, boxShadow: "0 22px 60px rgba(12,74,110,0.28)", display: "grid", gap: 14 }}>
            <div>
              <div style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: COLORS.brownLight, fontWeight: 700 }}>Assessment · verifies {activeAssessment.skill}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.brownDeep, marginTop: 4, fontFamily: FONT_DISPLAY }}>{activeAssessment.title}</div>
              <div style={{ fontSize: 12, color: COLORS.textLight, marginTop: 2 }}>
                Pass {activeAssessment.passingScore}% to earn a badge issued by {activeAssessment.company}. Time limit {activeAssessment.durationMinutes} min; later submissions are not scored.
              </div>
            </div>
            {(activeAssessment.questions || []).map((q, qi) => (
              <div key={qi} style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.brownDeep }}>{qi + 1}. {q.prompt}</div>
                <div style={{ display: "grid", gap: 4 }}>
                  {q.options.map((opt, oi) => (
                    <label key={oi} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: COLORS.textDark, cursor: "pointer", padding: "6px 8px", borderRadius: 8, background: answers[qi] === oi ? COLORS.parchmentDark : "transparent" }}>
                      <input type="radio" name={`q${qi}`} checked={answers[qi] === oi} onChange={() => setAnswers((prev) => ({ ...prev, [qi]: oi }))} />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {task && (
              <section aria-label="Practical task" style={{ display: "grid", gap: 8, borderTop: `1px solid ${COLORS.parchmentDeep}`, paddingTop: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.brownDeep }}>Practical task</div>
                <div style={{ fontSize: 13, color: COLORS.textDark, whiteSpace: "pre-wrap" }}>{task.prompt}</div>
                <div style={{ fontSize: 12, color: COLORS.textMid }}>
                  <strong>How it is scored:</strong> {task.rubric.map((r) => `${r.criterion} (${r.points} pts)`).join(" · ")}
                </div>
                <label style={{ display: "grid", gap: 4, fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>
                  Your answer{task.fileRequired ? " (optional notes)" : ""}
                  <textarea rows={5} value={taskAnswer} onChange={(e) => setTaskAnswer(e.target.value)} style={{ ...inputStyle, resize: "vertical", fontWeight: 400 }} />
                </label>
                <label style={{ display: "grid", gap: 4, fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>
                  Work file as proof{task.fileRequired ? " (required)" : " (optional)"} · PDF, image, ZIP or Office file, up to 10 MB
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.zip,.docx,.pptx,.xlsx" onChange={(e) => setTaskFile(e.target.files?.[0] || null)} style={{ fontWeight: 400 }} />
                </label>
                <div style={{ fontSize: 12, color: COLORS.textLight }}>The company scores your task with this rubric; you will be notified of the result.</div>
              </section>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
              <button type="button" style={ghostBtn} onClick={() => setClosedId(activeAssessment.id)}>Close (timer keeps running)</button>
              <button type="button" style={{ ...primaryBtn, opacity: canSubmit ? 1 : 0.6 }} onClick={submitAssessment} disabled={!canSubmit}>{task ? "Submit answers and task" : "Submit answers"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Labeled({ label, hint, error, children }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 12, color: COLORS.textLight }}>{hint}</span>}
      {error && <span role="alert" style={{ fontSize: 12, color: "#B91C1C" }}>{error}</span>}
    </label>
  );
}

function PreferencePicker({ label, hint, options, value, onChange }) {
  return (
    <fieldset style={{ border: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
      <legend style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid, padding: 0, marginBottom: 6 }}>{label} <span style={{ fontWeight: 400, color: COLORS.textLight }}>({hint})</span></legend>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {options.map((o) => {
          const on = value.includes(o);
          return (
            <label key={o} style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 36, padding: "4px 12px", borderRadius: 999, cursor: "pointer", fontSize: 13,
              border: `1px solid ${on ? COLORS.info : COLORS.parchmentDeep}`, background: on ? COLORS.parchmentDark : COLORS.cream, color: COLORS.brownDeep }}>
              <input type="checkbox" checked={on} onChange={() => onChange(on ? value.filter((v) => v !== o) : [...value, o])} />
              {o}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// Patent Fig. 8: the five units of the matching engine, in order, for this one job.
function ScoreBreakdown({ units }) {
  const { preference, alignment, proficiency, verification, combiner } = units;
  const row = (num, name, text) => (
    <li style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 8, padding: "4px 0", borderTop: `1px solid ${COLORS.parchmentDark}` }}>
      <span style={{ fontWeight: 600, color: COLORS.brownDeep }}>{name} <span style={{ color: COLORS.textLight, fontWeight: 400 }}>({num})</span></span>
      <span>{text}</span>
    </li>
  );
  return (
    <details style={{ marginTop: 8, fontSize: 12, color: COLORS.textMid }}>
      <summary style={{ cursor: "pointer", fontWeight: 600, color: COLORS.info, minHeight: 28, display: "inline-flex", alignItems: "center" }}>How this score was computed</summary>
      <ol style={{ listStyle: "none", padding: 0, margin: "6px 0 0" }}>
        {row(840, "Preference filter", preference.passed ? "Fits your work setup and job type preferences." : preference.reasons.join(" "))}
        {row(845, "Skill alignment", `You hold ${alignment.required[0]} of ${alignment.required[1]} required and ${alignment.preferred[0]} of ${alignment.preferred[1]} preferred skills.`)}
        {row(850, "Proficiency", proficiency.length === 0 ? "Every minimum level set by the employer is met."
          : proficiency.map((s) => `${s.name}: ${s.level === null ? "no proven level (not verified)" : `proven ${s.level}`}, needs ${s.minLevel}`).join("; ") + ".")}
        {row(855, "Verification weighting", `${verification.verified} verified skill(s) count in full; ${verification.evidenced || 0} claimed with a work sample count ${Math.round((verification.evidencedWeight || 0.8) * 100)}%; ${verification.claimed} bare claim(s) count ${Math.round(verification.claimedWeight * 100)}%.`)}
        {row(860, "Score combiner", `Required ${combiner.required} of 60 + preferred ${combiner.preferred} of 25 + location ${combiner.location} of 10 + experience ${combiner.experience} of 5 = ${combiner.total}%.`)}
      </ol>
    </details>
  );
}

const BADGE_METHOD = { assessment: "Passed a company assessment", scenario: "Passed a company assessment", portfolio: "Work reviewed by an employer", registry: "Checked against an official registry" };

// Patent Fig. 21: badge wallet (2104) and badge detail with a shareable verification link (2106).
function BadgeWallet({ badges, onFindJobs }) {
  const [openId, setOpenId] = useState(null);
  const [copied, setCopied] = useState(false);
  const open = badges.find((b) => b.id === openId);
  const share = (b, on) => router.post(`/badges/${b.id}/share`, { public: on }, { preserveScroll: true });
  const copy = async (url) => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* the link stays visible to copy by hand */ }
  };
  if (badges.length === 0) {
    return <div style={{ ...cardStyle, borderStyle: "dashed", fontSize: 13, color: COLORS.textMid }}>No verified badges yet. Pass an assessment or have your work reviewed to earn your first one.</div>;
  }
  if (open) {
    return (
      <div style={{ display: "grid", gap: 14, maxWidth: 560 }}>
        <button type="button" onClick={() => setOpenId(null)} style={{ ...ghostBtn, justifySelf: "start", minHeight: 40 }}>← All badges</button>
        <article style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
          <div style={{ background: `linear-gradient(135deg, ${COLORS.brownDeep}, ${COLORS.info})`, color: "#fff", padding: "20px 22px", display: "flex", gap: 14, alignItems: "center" }}>
            <IconAward size={36} />
            <div>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 20, margin: 0 }}>{open.badge || `${open.name} Verified`}</h2>
              <div style={{ fontFamily: "ui-monospace, Consolas, monospace", fontSize: 13, marginTop: 4, letterSpacing: "0.04em" }}>{open.verificationId}</div>
            </div>
          </div>
          <dl style={{ margin: 0, padding: "18px 22px", display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 14px", fontSize: 13 }}>
            <dt style={{ color: COLORS.textLight }}>How</dt><dd style={{ margin: 0 }}>{BADGE_METHOD[open.verificationMethod] || open.verificationMethod}</dd>
            <dt style={{ color: COLORS.textLight }}>Verified by</dt><dd style={{ margin: 0 }}>{open.verifiedBy}</dd>
            <dt style={{ color: COLORS.textLight }}>Date</dt><dd style={{ margin: 0 }}>{open.verifiedAt}</dd>
            <dt style={{ color: COLORS.textLight }}>Score</dt><dd style={{ margin: 0 }}>{open.level}%</dd>
            {open.assessmentResult && <><dt style={{ color: COLORS.textLight }}>Earned with</dt><dd style={{ margin: 0 }}>{open.assessmentResult.assessment} · {open.assessmentResult.score}% · {open.assessmentResult.takenAt}</dd></>}
            {open.evidence && <><dt style={{ color: COLORS.textLight }}>Evidence</dt><dd style={{ margin: 0 }}>{open.evidence}</dd></>}
          </dl>
          <section aria-labelledby="share-h" style={{ borderTop: `1px solid ${COLORS.parchmentDeep}`, padding: "16px 22px 20px", display: "grid", gap: 10 }}>
            <h3 id="share-h" style={{ margin: 0, fontSize: 14, color: COLORS.brownDeep }}>Shareable verification link</h3>
            <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: COLORS.textDark, cursor: "pointer", minHeight: 40 }}>
              <input type="checkbox" checked={!!open.shareUrl} onChange={(e) => share(open, e.target.checked)} style={{ width: 20, height: 20 }} />
              Anyone with the link can verify this badge (it shows your name)
            </label>
            {open.shareUrl ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input readOnly value={open.shareUrl} aria-label="Verification link" onFocus={(e) => e.target.select()} style={{ ...inputStyle, flex: "1 1 220px", fontSize: 12 }} />
                <button type="button" onClick={() => copy(open.shareUrl)} style={{ ...primaryBtn, minHeight: 40 }}>{copied ? "Copied" : "Copy link"}</button>
                <a href={open.shareUrl} target="_blank" rel="noreferrer" style={{ ...ghostBtn, minHeight: 40, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Open</a>
              </div>
            ) : (
              <span style={{ fontSize: 12, color: COLORS.textLight }}>Off: the link shows nothing until you turn it on. Employers on SkillBridge PH can always see your badges.</span>
            )}
          </section>
        </article>
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <ul aria-label="Your verified badges" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {badges.map((b) => (
          <li key={b.id}>
            <button type="button" onClick={() => setOpenId(b.id)} style={{ width: "100%", textAlign: "left", cursor: "pointer", border: "none", borderRadius: 14, padding: "16px 18px", minHeight: 120, color: "#fff", background: `linear-gradient(135deg, ${COLORS.brownDeep}, ${COLORS.info})`, display: "grid", gap: 6, fontFamily: FONT_BODY }}>
              <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <IconAward size={22} />
                <span style={{ fontSize: 12, fontWeight: 700 }}>{b.level}%</span>
              </span>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{b.badge || `${b.name} Verified`}</span>
              <span style={{ fontSize: 12, opacity: 0.85 }}>by {b.verifiedBy}</span>
              <span style={{ fontSize: 12, fontFamily: "ui-monospace, Consolas, monospace", opacity: 0.9 }}>{b.verificationId}{b.shareUrl ? " · link on" : ""}</span>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onFindJobs} style={{ ...ghostBtn, justifySelf: "start", minHeight: 40 }}>See jobs that match these badges</button>
    </div>
  );
}

// Fig. 19, 1908: where one application stands, as steps (text + marker, not color alone).
const TRACK_STEPS = [["applied", "Applied"], ["shortlisted", "Shortlisted"], ["interviewing", "Interview"], ["hired", "Hired"]];
function StatusTracker({ app }) {
  const dropped = app.status === "not_selected";
  const current = dropped ? 0 : TRACK_STEPS.findIndex(([k]) => k === app.status);
  return (
    <div style={{ ...cardStyle, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.brownDeep }}>{app.title}</div>
          <div style={{ fontSize: 12, color: COLORS.textMid, marginTop: 3 }}>{[app.company, app.location].filter(Boolean).join(" · ")} · updated {app.updatedAt}{app.jobOpen ? "" : " · job closed"}</div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: dropped ? "#475569" : app.status === "hired" ? "#15803D" : COLORS.info }}>
          {dropped ? "Not selected" : TRACK_STEPS[current]?.[1]}
        </span>
      </div>
      <ol aria-label={`Progress for ${app.title}`} style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: `repeat(${TRACK_STEPS.length}, 1fr)`, gap: 6 }}>
        {TRACK_STEPS.map(([key, label], i) => {
          const done = i < current || (i === current && !dropped);
          const isCurrent = i === current && !dropped;
          return (
            <li key={key} aria-current={isCurrent ? "step" : undefined} style={{ display: "grid", gap: 6 }}>
              <span style={{ height: 6, borderRadius: 4, background: dropped && i > 0 ? COLORS.parchmentDark : done ? COLORS.info : COLORS.parchmentDark }} aria-hidden="true" />
              <span style={{ fontSize: 12, color: done ? COLORS.brownDeep : COLORS.textLight, fontWeight: isCurrent ? 700 : 500 }}>
                {done ? "✓ " : ""}{label}
              </span>
            </li>
          );
        })}
      </ol>
      {dropped && <div style={{ fontSize: 12, color: COLORS.textMid }}>The employer decided not to move forward. Your badges stay on your profile for other roles.</div>}
    </div>
  );
}

function SkillPicker({ options, value, onToggle }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map((n) => {
        const on = value.includes(n);
        return (
          <label key={n} style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 32, padding: "2px 10px", borderRadius: 999, cursor: "pointer", fontSize: 12,
            border: `1px solid ${on ? COLORS.info : COLORS.parchmentDeep}`, background: on ? COLORS.parchmentDark : COLORS.cream, color: COLORS.brownDeep }}>
            <input type="checkbox" checked={on} onChange={() => onToggle(n)} />
            {n}
          </label>
        );
      })}
    </div>
  );
}

const STATUS_LABEL = {
  invited: "Invited by employer", applied: "Applied", shortlisted: "Shortlisted", interviewing: "Interview stage",
  hired: "Hired", not_selected: "Not selected", saved: "Saved", flagged: "Suggested match", declined: "You declined the invitation",
};
// Fig. 7, step 715: every skill on the card says where the applicant stands, in words (not color alone).
const SKILL_STATE = {
  verified: { label: "Verified", bg: "#F0FDF4", border: "#BBF7D0", color: "#166534" },
  evidenced: { label: "Claimed + work sample", bg: "#F0F9FF", border: "#7DD3FC", color: "#075985" },
  claimed: { label: "Claimed", bg: "#F0F9FF", border: "#BAE6FD", color: "#075985" },
  below: { label: "Below required level", bg: "#FFFBEB", border: "#FDE68A", color: "#92400E" },
  missing: { label: "Missing", bg: "#F8FAFC", border: "#E2E8F0", color: "#475569" },
};
const APPLIED_STAGES = ["applied", "shortlisted", "interviewing", "hired", "not_selected"];

function JobRow({ job, onApply, onSave, statusColor, hideStatusIfOpen, onOpenAssessments }) {
  const applied = APPLIED_STAGES.includes(job.status);
  const required = new Set((job.requiredSkills || []).map((s) => s.toLowerCase()));
  const a = job.assessment;
  return (
    <div style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 320px", minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.brownDeep }}>{job.title}</div>
        <div style={{ fontSize: 12, color: COLORS.textMid, marginTop: 3 }}>
          {[job.company, job.location, job.workSetup, job.employmentType, job.salaryRange].filter(Boolean).join(" · ")}
        </div>
        <ul aria-label="Your standing on this job's skills" style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", listStyle: "none", padding: 0, marginBottom: 0 }}>
          {(job.skillStates || []).map(({ name, state }) => {
            const st = SKILL_STATE[state] || SKILL_STATE.missing;
            return (
              <li key={name} style={{ padding: "4px 10px", borderRadius: 999, background: st.bg, border: `1px solid ${st.border}`, fontSize: 12, color: st.color }}>
                {state === "verified" && <IconCheck size={11} style={{ verticalAlign: "-1px", marginRight: 3 }} />}
                <strong style={{ fontWeight: 600 }}>{name}</strong>{required.has(name.toLowerCase()) ? "" : " (preferred)"} · {st.label}
              </li>
            );
          })}
        </ul>
        {a && (
          <div style={{ marginTop: 8, fontSize: 12, color: COLORS.textMid, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span>Assessment for this job: <strong>{a.title}</strong> ·</span>
            {a.passed ? <span style={{ color: COLORS.success, fontWeight: 700 }}>Passed</span>
              : a.locked ? <span style={{ color: "#92400E", fontWeight: 700 }}>No attempts left</span>
              : a.nextAttemptAt ? <span style={{ color: "#92400E", fontWeight: 700 }}>Retake after {a.nextAttemptAt}</span>
              : <button type="button" onClick={onOpenAssessments} style={{ ...ghostBtn, padding: "4px 10px", minHeight: 32 }}>Take it ({a.left} attempt{a.left === 1 ? "" : "s"} left)</button>}
          </div>
        )}
        {job.preferenceFit === false && (
          <div style={{ marginTop: 8, fontSize: 12, color: "#92400E" }}>
            Outside your job preferences: {job.units.preference.reasons.join(" ")} It stays out of your suggested matches.
          </div>
        )}
        {job.units && <ScoreBreakdown units={job.units} />}
        <div style={{ fontSize: 12, color: COLORS.textLight, marginTop: 6 }}>
          Required {job.matchedRequired}/{job.requiredCount} · Preferred {job.matchedPreferred}/{job.preferredCount} · Location {job.locationMatch ? "Yes" : "No"} · Experience {job.experienceMatch ? "Yes" : "No"}
        </div>
        {!(hideStatusIfOpen && job.status === "open") && (
          <span style={{ display: "inline-block", marginTop: 8, fontSize: 12, fontWeight: 700, color: statusColor(job.status) }}>
            {STATUS_LABEL[job.status] || job.status}
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, color: job.score >= 85 ? COLORS.success : COLORS.info }}>{job.score}%</div>
          <div style={{ fontSize: 12, color: COLORS.textLight }}>match</div>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <button onClick={onApply} disabled={applied} style={{ ...primaryBtn, minHeight: 36, opacity: applied ? 0.6 : 1, cursor: applied ? "default" : "pointer" }}>{applied ? "Applied" : "Apply"}</button>
          {!applied && <button onClick={onSave} disabled={job.status === "saved"} style={{ ...ghostBtn, minHeight: 36 }}>{job.status === "saved" ? "Saved" : "Save"}</button>}
        </div>
      </div>
    </div>
  );
}
