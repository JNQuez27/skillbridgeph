import { useMemo, useState } from "react";
import { useForm } from "@inertiajs/react";
import { IconCheck, IconPlus } from "../components/Icons";

// Local blue + green brand palette.
const COLORS = {
  parchment: "#F0F9FF",
  parchmentDark: "#E0F2FE",
  parchmentDeep: "#BAE6FD",
  cream: "#FFFFFF",
  brownDeep: "#0C4A6E",
  brownMid: "#075985",
  brownLight: "#0369A1",
  textDark: "#0C4A6E",
  textMid: "#075985",
  textLight: "#64748B",
  success: "#16A34A",
  goldLight: "#4ADE80",
  info: "#0369A1",
};

const FONT_DISPLAY = "'Lexend', sans-serif";
const FONT_BODY = "'Source Sans 3', sans-serif";

const inputStyle = {
  padding: "10px 12px", borderRadius: 10, border: `1px solid ${COLORS.parchmentDeep}`,
  background: COLORS.cream, fontSize: 13, color: COLORS.textDark, fontFamily: FONT_BODY,
};
const primaryBtn = {
  padding: "9px 16px", borderRadius: 9, border: "none", background: COLORS.info,
  color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: FONT_BODY,
  display: "inline-flex", alignItems: "center", gap: 6,
};
const ghostBtn = {
  padding: "9px 16px", borderRadius: 9, border: `1px solid ${COLORS.parchmentDeep}`,
  background: "transparent", color: COLORS.brownDeep, fontWeight: 600, fontSize: 12,
  cursor: "pointer", fontFamily: FONT_BODY,
};

function Modal({ title, eyebrow, onClose, children }) {
  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(12, 74, 110, 0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 50,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: COLORS.cream, borderRadius: 16, padding: "22px 24px", width: "min(680px, 100%)",
        maxHeight: "86vh", overflowY: "auto", border: `1px solid ${COLORS.parchmentDeep}`,
        boxShadow: "0 22px 60px rgba(12, 74, 110, 0.28)", display: "grid", gap: 16,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: COLORS.brownLight, fontWeight: 700 }}>{eyebrow}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.brownDeep, marginTop: 6, fontFamily: FONT_DISPLAY }}>{title}</div>
          </div>
          <button type="button" onClick={onClose} style={{ border: "none", background: COLORS.parchment, borderRadius: 999, width: 32, height: 32, cursor: "pointer", color: COLORS.textMid, fontWeight: 700 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>{label}</span>
      {children}
    </label>
  );
}

export default function EmployerView({ account }) {
  const company = account?.company || {};
  const stats = account?.stats || {};
  const jobPosts = account?.jobPosts || [];
  const assessments = account?.assessments || [];
  const matches = account?.matches || [];
  const topCandidates = account?.topCandidates || [];

  const [tab, setTab] = useState("job-offers");
  const [jobOpen, setJobOpen] = useState(false);
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const statStrip = [
    { label: "Active applicants", value: stats.activeApplicants ?? 0, color: COLORS.textDark },
    { label: "Shortlisted", value: stats.shortlisted ?? 0, color: COLORS.success },
    { label: "Interviewing", value: stats.interviewing ?? 0, color: COLORS.info },
    { label: "Hired this month", value: stats.hired ?? 0, color: COLORS.success },
  ];

  const skillDemand = useMemo(() => {
    const counts = {};
    jobPosts.forEach((job) => (job.requiredSkills || []).forEach((s) => { counts[s] = (counts[s] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [jobPosts]);

  const jobForm = useForm({
    title: "", locationCity: company.locationCity || "", locationRegion: company.locationRegion || "",
    employmentType: "Full-time", workSetup: "On-site", salaryRange: "", description: "",
    responsibilities: "", requiredSkills: "", preferredSkills: "", experienceLevel: "Entry",
    educationRequirement: "", closingDate: "",
  });
  const submitJob = (e) => {
    e.preventDefault();
    jobForm.post("/job-posts", { preserveScroll: true, onSuccess: () => { jobForm.reset(); setJobOpen(false); } });
  };

  const assessmentForm = useForm({ title: "", role: "", questionCount: 10, durationMinutes: 20, passingScore: 70, instructions: "" });
  const submitAssessment = (e) => {
    e.preventDefault();
    assessmentForm.post("/assessments", { preserveScroll: true, onSuccess: () => { assessmentForm.reset(); setAssessmentOpen(false); } });
  };

  const profileForm = useForm({
    companyName: company.companyName || "", industry: company.industry || "", companySize: company.companySize || "",
    locationCity: company.locationCity || "", locationRegion: company.locationRegion || "",
    recruiterName: company.recruiterName || "", recruiterPosition: company.recruiterPosition || "",
    recruiterContact: company.recruiterContact || "", emailVerified: company.emailVerified || false,
  });
  const submitProfile = (e) => {
    e.preventDefault();
    profileForm.put("/employer-profile", { preserveScroll: true, onSuccess: () => setProfileOpen(false) });
  };

  const card = { background: COLORS.cream, borderRadius: 12, border: `1px solid ${COLORS.parchmentDeep}`, padding: "16px 18px" };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1336, width: "100%", margin: "0 auto", display: "grid", gap: 16, fontFamily: FONT_BODY, background: COLORS.parchment, minHeight: "calc(100vh - 64px)" }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${COLORS.brownDeep} 0%, ${COLORS.brownMid} 55%, ${COLORS.info} 100%)`,
        borderRadius: 16, padding: "22px 26px", color: "#fff",
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap",
        boxShadow: "0 20px 44px rgba(12, 74, 110, 0.22)",
      }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: COLORS.goldLight, fontWeight: 700 }}>Employer workspace</div>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, margin: "6px 0 4px", color: "#fff" }}>{company.companyName || "Your Company"}</h2>
          <p style={{ color: "rgba(224,242,254,0.75)", fontSize: 12, margin: 0 }}>{jobPosts.length} active role(s) · {stats.activeApplicants ?? 0} applicants</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={{ ...primaryBtn, background: `linear-gradient(90deg, ${COLORS.success}, ${COLORS.goldLight})`, color: "#0C4A6E", fontWeight: 700 }} onClick={() => setJobOpen(true)}><IconPlus size={14} /> Post new job</button>
          <button style={{ ...ghostBtn, border: "1px solid rgba(255,255,255,0.3)", color: "#fff", background: "rgba(255,255,255,0.1)" }} onClick={() => setInviteOpen(true)}>Invite candidate</button>
        </div>
      </div>

      {/* Stat strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
        {statStrip.map((s) => (
          <div key={s.label} style={{ ...card, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: COLORS.textMid, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: FONT_DISPLAY }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16, alignItems: "start" }}>
        {/* Sidebar */}
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ ...card, display: "grid", gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: COLORS.textLight }}>Company profile</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.brownDeep }}>{company.companyName || "Your Company"}</div>
            <div style={{ fontSize: 12, color: COLORS.textMid, lineHeight: 1.5 }}>
              {(company.industry || "Industry")} · {(company.locationCity || "Location")}<br />
              {(company.companySize || "—")} employees
            </div>
            <button type="button" onClick={() => setProfileOpen(true)} style={{ ...ghostBtn, width: "100%", marginTop: 4 }}>Edit profile</button>
          </div>
          <div style={{ ...card, display: "grid", gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: COLORS.textLight }}>Verification</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: company.emailVerified ? COLORS.success : COLORS.textMid }}>
              <IconCheck size={14} /> {company.emailVerified ? "Company email verified" : "Not yet verified"}
            </div>
          </div>
        </div>

        {/* Main */}
        <div>
          <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${COLORS.parchmentDeep}`, marginBottom: 16, overflowX: "auto" }}>
            {["job-offers", "assessments", "matches", "analytics"].map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "9px 16px", border: "none", background: "transparent", fontSize: 13,
                fontWeight: tab === t ? 600 : 400, color: tab === t ? COLORS.info : COLORS.textLight,
                borderBottom: tab === t ? `2px solid ${COLORS.info}` : "2px solid transparent",
                cursor: "pointer", fontFamily: FONT_BODY, textTransform: "capitalize", whiteSpace: "nowrap",
              }}>{t.replace("-", " ")}</button>
            ))}
          </div>

          {tab === "job-offers" && (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.brownDeep }}>Job offers</div>
                <button type="button" onClick={() => setJobOpen(true)} style={primaryBtn}><IconPlus size={14} /> Post new job</button>
              </div>
              {jobPosts.length === 0 ? (
                <div style={{ ...card, borderStyle: "dashed", fontSize: 13, color: COLORS.textMid }}>No job offers yet. Post your first role to start receiving matches.</div>
              ) : jobPosts.map((job) => (
                <div key={job.id} style={{ ...card, display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.brownDeep }}>{job.title}</div>
                      <div style={{ fontSize: 12, color: COLORS.textMid, marginTop: 3 }}>{job.locationCity}{job.locationRegion ? `, ${job.locationRegion}` : ""} · {job.workSetup} · {job.employmentType}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span className="sbph-badge badge-open">{job.status}</span>
                      <span style={{ padding: "4px 10px", borderRadius: 999, background: COLORS.parchment, fontSize: 11, color: COLORS.textMid, border: `1px solid ${COLORS.parchmentDeep}` }}>{job.applicants} applicants</span>
                      {job.salaryRange && <span style={{ padding: "4px 10px", borderRadius: 999, background: COLORS.parchment, fontSize: 11, color: COLORS.textMid, border: `1px solid ${COLORS.parchmentDeep}` }}>{job.salaryRange}</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.textLight }}>Required: {(job.requiredSkills || []).join(", ") || "—"}</div>
                </div>
              ))}
            </div>
          )}

          {tab === "assessments" && (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.brownDeep }}>Company assessments</div>
                <button type="button" onClick={() => setAssessmentOpen(true)} style={primaryBtn}><IconPlus size={14} /> Post assessment</button>
              </div>
              {assessments.length === 0 ? (
                <div style={{ ...card, borderStyle: "dashed", fontSize: 13, color: COLORS.textMid }}>No assessments yet.</div>
              ) : assessments.map((a) => (
                <div key={a.id} style={{ ...card, display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.brownDeep }}>{a.title}</div>
                      <div style={{ fontSize: 12, color: COLORS.textMid, marginTop: 3 }}>{a.role} · {a.questionCount} questions · {a.durationMinutes} min · Pass {a.passingScore}%</div>
                    </div>
                    <span className="sbph-badge badge-open">{a.status}</span>
                  </div>
                  {a.instructions && <div style={{ fontSize: 12, color: COLORS.textLight }}>{a.instructions}</div>}
                </div>
              ))}
            </div>
          )}

          {tab === "matches" && (
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ fontSize: 12, color: COLORS.textMid }}>Verified-skill matches per role (70%+ shown).</div>
              {matches.length === 0 && <div style={{ ...card, borderStyle: "dashed", fontSize: 13, color: COLORS.textMid }}>Post a job to see candidate matches.</div>}
              {matches.map(({ job, candidates }) => (
                <div key={job.id} style={{ ...card, display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.brownDeep }}>{job.title}</div>
                    <span style={{ padding: "4px 10px", borderRadius: 999, background: COLORS.parchment, fontSize: 11, color: COLORS.textMid, border: `1px solid ${COLORS.parchmentDeep}` }}>{candidates.length} match(es)</span>
                  </div>
                  {candidates.length === 0 ? (
                    <div style={{ fontSize: 12, color: COLORS.textMid }}>No candidates above 70% yet.</div>
                  ) : candidates.map((c) => (
                    <div key={c.id} style={{ background: COLORS.parchment, borderRadius: 10, padding: "12px 14px", border: `1px solid ${COLORS.parchmentDeep}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.info}, ${COLORS.success})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{c.avatar}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.brownDeep }}>{c.name}</div>
                          <div style={{ fontSize: 12, color: COLORS.textMid, marginTop: 2 }}>{c.role} · {c.location}</div>
                          <div style={{ fontSize: 11, color: COLORS.textLight, marginTop: 4 }}>Matched skills: {c.matchedSkills}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 600, color: c.score >= 85 ? COLORS.success : COLORS.info }}>{c.score}%</div>
                          <div style={{ fontSize: 10, color: COLORS.textLight }}>match</div>
                        </div>
                        <button style={{ ...primaryBtn, padding: "6px 12px" }}>Invite</button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {tab === "analytics" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={card}>
                <h4 style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: COLORS.brownDeep, marginBottom: 14 }}>Roles &amp; applicants</h4>
                {jobPosts.length === 0 && <div style={{ fontSize: 12, color: COLORS.textLight }}>No data yet.</div>}
                {jobPosts.map((job) => (
                  <div key={job.id} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: COLORS.textDark }}>{job.title}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.brownLight }}>{job.applicants} applicants</span>
                    </div>
                    <div style={{ background: COLORS.parchmentDeep, borderRadius: 6, height: 6 }}>
                      <div style={{ width: `${Math.min(100, job.applicants * 12)}%`, height: "100%", borderRadius: 6, background: `linear-gradient(90deg, ${COLORS.info}, ${COLORS.success})` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={card}>
                <h4 style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: COLORS.brownDeep, marginBottom: 14 }}>Top skill demand</h4>
                {skillDemand.length === 0 && <div style={{ fontSize: 12, color: COLORS.textLight }}>No data yet.</div>}
                {skillDemand.map(([skill, count]) => (
                  <div key={skill} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: COLORS.textDark }}>{skill}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.brownLight }}>{count} role(s)</span>
                    </div>
                    <div style={{ background: COLORS.parchmentDeep, borderRadius: 6, height: 6 }}>
                      <div style={{ width: `${Math.min(100, count * 25)}%`, height: "100%", borderRadius: 6, background: `linear-gradient(90deg, ${COLORS.info}, ${COLORS.success})` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Post job modal */}
      {jobOpen && (
        <Modal eyebrow="Post new job" title="Create a job offer" onClose={() => setJobOpen(false)}>
          <form onSubmit={submitJob} style={{ display: "grid", gap: 12 }}>
            <Field label="Job Title"><input style={inputStyle} value={jobForm.data.title} onChange={(e) => jobForm.setData("title", e.target.value)} />{jobForm.errors.title && <span style={{ fontSize: 11, color: "#DC2626" }}>{jobForm.errors.title}</span>}</Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="City"><input style={inputStyle} value={jobForm.data.locationCity} onChange={(e) => jobForm.setData("locationCity", e.target.value)} /></Field>
              <Field label="Region (optional)"><input style={inputStyle} value={jobForm.data.locationRegion} onChange={(e) => jobForm.setData("locationRegion", e.target.value)} /></Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Job Type"><select style={inputStyle} value={jobForm.data.employmentType} onChange={(e) => jobForm.setData("employmentType", e.target.value)}><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option></select></Field>
              <Field label="Work Setup"><select style={inputStyle} value={jobForm.data.workSetup} onChange={(e) => jobForm.setData("workSetup", e.target.value)}><option>On-site</option><option>Hybrid</option><option>Remote</option></select></Field>
            </div>
            <Field label="Required Skills (comma-separated)"><input style={inputStyle} placeholder="React, CSS, JavaScript" value={jobForm.data.requiredSkills} onChange={(e) => jobForm.setData("requiredSkills", e.target.value)} />{jobForm.errors.requiredSkills && <span style={{ fontSize: 11, color: "#DC2626" }}>{jobForm.errors.requiredSkills}</span>}</Field>
            <Field label="Preferred Skills (comma-separated)"><input style={inputStyle} placeholder="Figma, Git" value={jobForm.data.preferredSkills} onChange={(e) => jobForm.setData("preferredSkills", e.target.value)} /></Field>
            <Field label="Salary Range (optional)"><input style={inputStyle} placeholder="PHP 20k-30k" value={jobForm.data.salaryRange} onChange={(e) => jobForm.setData("salaryRange", e.target.value)} /></Field>
            <Field label="Responsibilities"><textarea rows={2} style={{ ...inputStyle, resize: "vertical" }} value={jobForm.data.responsibilities} onChange={(e) => jobForm.setData("responsibilities", e.target.value)} />{jobForm.errors.responsibilities && <span style={{ fontSize: 11, color: "#DC2626" }}>{jobForm.errors.responsibilities}</span>}</Field>
            <Field label="Job Description"><textarea rows={2} style={{ ...inputStyle, resize: "vertical" }} value={jobForm.data.description} onChange={(e) => jobForm.setData("description", e.target.value)} />{jobForm.errors.description && <span style={{ fontSize: 11, color: "#DC2626" }}>{jobForm.errors.description}</span>}</Field>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" style={ghostBtn} onClick={() => setJobOpen(false)}>Cancel</button>
              <button type="submit" disabled={jobForm.processing} style={{ ...primaryBtn, opacity: jobForm.processing ? 0.6 : 1 }}>Publish job offer</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Post assessment modal */}
      {assessmentOpen && (
        <Modal eyebrow="Post assessment" title="Create a company assessment" onClose={() => setAssessmentOpen(false)}>
          <form onSubmit={submitAssessment} style={{ display: "grid", gap: 12 }}>
            <Field label="Assessment Title"><input style={inputStyle} value={assessmentForm.data.title} onChange={(e) => assessmentForm.setData("title", e.target.value)} />{assessmentForm.errors.title && <span style={{ fontSize: 11, color: "#DC2626" }}>{assessmentForm.errors.title}</span>}</Field>
            <Field label="Target Role"><input style={inputStyle} value={assessmentForm.data.role} onChange={(e) => assessmentForm.setData("role", e.target.value)} />{assessmentForm.errors.role && <span style={{ fontSize: 11, color: "#DC2626" }}>{assessmentForm.errors.role}</span>}</Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <Field label="Questions"><input type="number" min="1" style={inputStyle} value={assessmentForm.data.questionCount} onChange={(e) => assessmentForm.setData("questionCount", e.target.value)} /></Field>
              <Field label="Duration (min)"><input type="number" min="1" style={inputStyle} value={assessmentForm.data.durationMinutes} onChange={(e) => assessmentForm.setData("durationMinutes", e.target.value)} /></Field>
              <Field label="Passing (%)"><input type="number" min="1" max="100" style={inputStyle} value={assessmentForm.data.passingScore} onChange={(e) => assessmentForm.setData("passingScore", e.target.value)} /></Field>
            </div>
            <Field label="Instructions (optional)"><textarea rows={2} style={{ ...inputStyle, resize: "vertical" }} value={assessmentForm.data.instructions} onChange={(e) => assessmentForm.setData("instructions", e.target.value)} /></Field>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" style={ghostBtn} onClick={() => setAssessmentOpen(false)}>Cancel</button>
              <button type="submit" disabled={assessmentForm.processing} style={{ ...primaryBtn, opacity: assessmentForm.processing ? 0.6 : 1 }}>Publish assessment</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Invite / top candidates modal */}
      {inviteOpen && (
        <Modal eyebrow="Invite candidates" title="Top applicant suggestions" onClose={() => setInviteOpen(false)}>
          <div style={{ display: "grid", gap: 10 }}>
            {topCandidates.length === 0 && <div style={{ fontSize: 13, color: COLORS.textMid }}>No candidates yet.</div>}
            {topCandidates.map((c) => (
              <div key={c.id} style={{ background: COLORS.parchment, borderRadius: 12, padding: "14px 16px", border: `1px solid ${COLORS.parchmentDeep}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.info}, ${COLORS.success})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{c.avatar}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.brownDeep }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: COLORS.textMid, marginTop: 2 }}>{c.role}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      {(c.skills || []).slice(0, 3).map((s) => <span key={s} style={{ padding: "3px 8px", borderRadius: 999, background: COLORS.cream, fontSize: 10, color: COLORS.textMid, border: `1px solid ${COLORS.parchmentDeep}` }}>{s}</span>)}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 600, color: c.score >= 90 ? COLORS.success : COLORS.info }}>{c.score}%</div>
                    <div style={{ fontSize: 10, color: COLORS.textLight }}>skill score</div>
                  </div>
                  <button style={{ ...primaryBtn, padding: "6px 12px" }}>Invite</button>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Edit profile modal */}
      {profileOpen && (
        <Modal eyebrow="Company profile" title="Update company profile" onClose={() => setProfileOpen(false)}>
          <form onSubmit={submitProfile} style={{ display: "grid", gap: 12 }}>
            <Field label="Company Name"><input style={inputStyle} value={profileForm.data.companyName} onChange={(e) => profileForm.setData("companyName", e.target.value)} />{profileForm.errors.companyName && <span style={{ fontSize: 11, color: "#DC2626" }}>{profileForm.errors.companyName}</span>}</Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Industry"><input style={inputStyle} value={profileForm.data.industry} onChange={(e) => profileForm.setData("industry", e.target.value)} /></Field>
              <Field label="Company Size"><input style={inputStyle} value={profileForm.data.companySize} onChange={(e) => profileForm.setData("companySize", e.target.value)} /></Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="City"><input style={inputStyle} value={profileForm.data.locationCity} onChange={(e) => profileForm.setData("locationCity", e.target.value)} /></Field>
              <Field label="Region"><input style={inputStyle} value={profileForm.data.locationRegion} onChange={(e) => profileForm.setData("locationRegion", e.target.value)} /></Field>
            </div>
            <Field label="Recruiter Name"><input style={inputStyle} value={profileForm.data.recruiterName} onChange={(e) => profileForm.setData("recruiterName", e.target.value)} /></Field>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: COLORS.textMid }}>
              <input type="checkbox" checked={profileForm.data.emailVerified} onChange={(e) => profileForm.setData("emailVerified", e.target.checked)} /> Company email verified
            </label>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" style={ghostBtn} onClick={() => setProfileOpen(false)}>Cancel</button>
              <button type="submit" disabled={profileForm.processing} style={{ ...primaryBtn, opacity: profileForm.processing ? 0.6 : 1 }}>Save profile</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
