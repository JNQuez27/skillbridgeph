import { useState } from "react";
import { router, useForm } from "@inertiajs/react";
import SkillBar from "../components/SkillBar";
import {
  IconCheck,
  IconStar,
  IconAward,
  IconBriefcase,
  IconPlus,
  IconMapPin,
  IconZap,
  IconTarget,
  IconClipboardCheck,
} from "../components/Icons";

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

const sectionMeta = {
  skills: { label: "Skills & Badges", sub: "Your verified proof of skill.", Icon: IconZap },
  portfolio: { label: "Credentials & Portfolio", sub: "Upload your resume, certificates, and work.", Icon: IconBriefcase },
  matches: { label: "Job Matches", sub: "Jobs matched to you — pick the ones that fit.", Icon: IconTarget },
  assessments: { label: "Assessments", sub: "Company assessments and results.", Icon: IconClipboardCheck },
};

const badgeActionLabel = (method) => {
  if (method === "portfolio") return "Submit Portfolio";
  if (method === "scenario") return "Start Scenario";
  return "Take Assessment";
};

const formatBytes = (bytes) => {
  if (!bytes) return "";
  const kb = bytes / 1024;
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
};

export default function ProfileView({ account, activeTab = "skills" }) {
  const tab = sectionMeta[activeTab] ? activeTab : "skills";
  const profile = account?.profile || {};
  const skills = account?.skills || [];
  const credentials = account?.credentials || [];
  const matches = account?.matches || [];
  const assessments = account?.assessments || [];

  const SectionIcon = sectionMeta[tab].Icon;
  const cardStyle = { background: COLORS.cream, borderRadius: 14, padding: "22px 20px", border: `1px solid ${COLORS.parchmentDeep}` };
  const headingStyle = { fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 600, color: COLORS.brownDeep, marginBottom: 14 };
  const primaryBtn = { padding: "8px 14px", borderRadius: 8, background: COLORS.info, border: "none", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT_BODY };

  const verifiedSkills = skills.filter((s) => s.verificationStatus === "verified");
  const pendingSkills = skills.filter((s) => s.verificationStatus !== "verified");

  const upload = useForm({ type: "resume", title: "", file: null });
  const submitCredential = (event) => {
    event.preventDefault();
    upload.post("/credentials", {
      forceFormData: true,
      preserveScroll: true,
      onSuccess: () => upload.reset("title", "file"),
    });
  };
  const deleteCredential = (id) => router.delete(`/credentials/${id}`, { preserveScroll: true });
  const pickJob = (jobId, status) => router.post(`/applications/${jobId}`, { status }, { preserveScroll: true });

  return (
    <div style={{ padding: "28px 32px", fontFamily: FONT_BODY, background: COLORS.parchment, minHeight: "calc(100vh - 64px)" }}>
      {/* Profile header */}
      <div style={{
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
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 600, color: "#fff", marginBottom: 4 }}>
            {profile.name}
          </h2>
          <p style={{ color: "rgba(224,242,254,0.85)", fontSize: 13, marginBottom: 12 }}>{profile.headline}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {profile.stats?.badges > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(34,197,94,0.18)", color: COLORS.goldLight, padding: "4px 11px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                <IconCheck size={12} /> {profile.stats.badges} verified
              </span>
            )}
            {matches.length > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.12)", color: "#fff", padding: "4px 11px", borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
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
              <div style={{ fontSize: 11, color: "rgba(224,242,254,0.7)" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Section heading */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <span style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: COLORS.parchmentDark, color: COLORS.brownLight,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <SectionIcon size={20} />
        </span>
        <div>
          <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 600, color: COLORS.brownDeep }}>
            {sectionMeta[tab].label}
          </h3>
          <p style={{ fontSize: 12, color: COLORS.textLight }}>{sectionMeta[tab].sub}</p>
        </div>
      </div>

      {tab === "skills" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
          <div style={cardStyle}>
            <h4 style={headingStyle}>Verified Skill Badges (Proof of Skill)</h4>
            {skills.length === 0 && <p style={{ fontSize: 13, color: COLORS.textLight }}>No skills yet.</p>}
            {skills.map((s) => <SkillBar key={s.name} skill={s} />)}
          </div>
          <div>
            <div style={{ ...cardStyle, marginBottom: 16 }}>
              <h4 style={headingStyle}>Earned Badges</h4>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {verifiedSkills.filter((s) => s.badge).map((s) => (
                  <div key={s.name} style={{
                    background: `linear-gradient(135deg, ${COLORS.brownMid}, ${COLORS.info})`,
                    borderRadius: 14, padding: "16px 16px", textAlign: "center", minWidth: 104,
                    border: "1px solid rgba(255,255,255,0.14)", color: "#fff",
                  }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 8, color: COLORS.goldLight }}>
                      <IconAward size={24} />
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#fff" }}>{s.badge}</div>
                    <div style={{ fontSize: 10, color: "rgba(224,242,254,0.75)", marginTop: 2 }}>{s.name.split("/")[0].trim()}</div>
                  </div>
                ))}
                {verifiedSkills.filter((s) => s.badge).length === 0 && (
                  <p style={{ fontSize: 12, color: COLORS.textLight }}>No earned badges yet.</p>
                )}
              </div>
            </div>
            <div style={cardStyle}>
              <h4 style={headingStyle}>Badge Pathways</h4>
              <p style={{ fontSize: 12, color: COLORS.textLight, marginTop: 0, marginBottom: 12 }}>
                Complete the assessment, scenario, or portfolio check to convert these into verified badges.
              </p>
              {pendingSkills.length === 0 && <p style={{ fontSize: 12, color: COLORS.textLight }}>All your skills are verified.</p>}
              {pendingSkills.map((s) => (
                <div key={s.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, padding: "10px 14px", background: COLORS.parchment, borderRadius: 10 }}>
                  <span style={{ fontSize: 13, color: COLORS.textDark }}>{s.name}</span>
                  <button style={{ ...primaryBtn, padding: "6px 14px", fontSize: 11 }}>{badgeActionLabel(s.verificationMethod)}</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "portfolio" && (
        <div style={{ display: "grid", gap: 20 }}>
          <form onSubmit={submitCredential} style={{ ...cardStyle, display: "grid", gap: 14 }}>
            <h4 style={{ ...headingStyle, marginBottom: 0 }}>Upload a credential</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Type</span>
                <select
                  value={upload.data.type}
                  onChange={(e) => upload.setData("type", e.target.value)}
                  style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${COLORS.parchmentDeep}`, background: COLORS.cream, fontSize: 13, color: COLORS.textDark, fontFamily: FONT_BODY }}
                >
                  <option value="resume">Resume / CV</option>
                  <option value="certificate">Certificate</option>
                  <option value="portfolio">Portfolio</option>
                </select>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Title (optional)</span>
                <input
                  type="text"
                  value={upload.data.title}
                  placeholder="e.g. 2026 Resume"
                  onChange={(e) => upload.setData("title", e.target.value)}
                  style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${COLORS.parchmentDeep}`, background: COLORS.cream, fontSize: 13, color: COLORS.textDark, fontFamily: FONT_BODY }}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>File (PDF/DOC/image, max 5MB)</span>
                <input
                  type="file"
                  onChange={(e) => upload.setData("file", e.target.files[0])}
                  style={{ padding: "8px 10px", borderRadius: 10, border: `1px solid ${COLORS.parchmentDeep}`, background: COLORS.cream, fontSize: 12, color: COLORS.textDark, fontFamily: FONT_BODY }}
                />
              </label>
            </div>
            {upload.errors.file && <span style={{ fontSize: 12, color: "#DC2626" }}>{upload.errors.file}</span>}
            <div>
              <button type="submit" disabled={upload.processing || !upload.data.file} style={{ ...primaryBtn, opacity: upload.processing || !upload.data.file ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <IconPlus size={14} /> {upload.processing ? "Uploading…" : "Upload credential"}
              </button>
            </div>
          </form>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {credentials.length === 0 && (
              <p style={{ fontSize: 13, color: COLORS.textLight }}>No credentials uploaded yet.</p>
            )}
            {credentials.map((c) => (
              <div key={c.id} style={{ ...cardStyle, display: "grid", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.brownLight }}>
                  <IconBriefcase size={18} />
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: COLORS.textLight }}>{c.type}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.brownDeep, wordBreak: "break-word" }}>{c.title}</div>
                <div style={{ fontSize: 12, color: COLORS.textLight }}>{c.originalName} · {formatBytes(c.size)}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <a href={c.url} target="_blank" rel="noreferrer" style={{ ...primaryBtn, textDecoration: "none", padding: "6px 12px" }}>View</a>
                  <button onClick={() => deleteCredential(c.id)} style={{ padding: "6px 12px", borderRadius: 8, background: "transparent", border: `1px solid ${COLORS.parchmentDeep}`, color: "#B91C1C", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "matches" && (
        <div style={{ display: "grid", gap: 12 }}>
          {matches.length === 0 ? (
            <div style={{ ...cardStyle, borderStyle: "dashed", fontSize: 13, color: COLORS.textMid }}>
              No matched jobs yet. Add verified skills and credentials to unlock recommendations.
            </div>
          ) : (
            matches.map((job) => {
              const statusColor = job.status === "applied" ? "#15803D" : job.status === "saved" ? "#0369A1" : "#B45309";
              return (
                <div key={job.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.brownDeep }}>{job.title}</div>
                    <div style={{ fontSize: 12, color: COLORS.textMid, marginTop: 3 }}>{job.company} · {job.location}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                      {job.requiredSkills.slice(0, 4).map((skill) => (
                        <span key={skill} style={{ padding: "4px 10px", borderRadius: 999, background: COLORS.parchment, fontSize: 11, color: COLORS.textMid, border: `1px solid ${COLORS.parchmentDeep}` }}>{skill}</span>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: COLORS.textLight, marginTop: 6 }}>
                      Required {job.matchedRequired}/{job.requiredCount} · Preferred {job.matchedPreferred}/{job.preferredCount} · Location {job.locationMatch ? "Yes" : "No"} · Experience {job.experienceMatch ? "Yes" : "No"}
                    </div>
                    <span style={{ display: "inline-block", marginTop: 8, fontSize: 11, fontWeight: 700, textTransform: "capitalize", color: statusColor }}>{job.status}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, color: job.score >= 85 ? COLORS.success : COLORS.info }}>{job.score}%</div>
                      <div style={{ fontSize: 10, color: COLORS.textLight }}>match</div>
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      <button onClick={() => pickJob(job.id, "applied")} disabled={job.status === "applied"} style={{ ...primaryBtn, opacity: job.status === "applied" ? 0.6 : 1 }}>
                        {job.status === "applied" ? "Applied" : "Apply"}
                      </button>
                      <button onClick={() => pickJob(job.id, "saved")} style={{ padding: "8px 14px", borderRadius: 8, background: "transparent", border: `1px solid ${COLORS.parchmentDeep}`, color: COLORS.brownDeep, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Save</button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "assessments" && (
        <div style={{ display: "grid", gap: 16 }}>
          {assessments.length === 0 && (
            <div style={{ ...cardStyle, borderStyle: "dashed", fontSize: 13, color: COLORS.textMid }}>No assessments available yet.</div>
          )}
          {assessments.map((company) => (
            <div key={company.company} style={{ ...cardStyle, display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.brownDeep }}>{company.company}</div>
                  <div style={{ fontSize: 12, color: COLORS.textLight, marginTop: 4 }}>{company.location}</div>
                </div>
                <span style={{ fontSize: 12, color: COLORS.textMid }}>{company.assessments.length} assessment(s)</span>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {company.assessments.map((assessment) => (
                  <details key={assessment.id} style={{ borderRadius: 12, border: `1px solid ${COLORS.parchmentDeep}`, background: COLORS.parchment, padding: "12px 14px" }}>
                    <summary style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, fontSize: 13, fontWeight: 600, color: COLORS.brownDeep, cursor: "pointer", listStyle: "none" }}>
                      <span>{company.company} - {assessment.title}</span>
                      <span style={{ fontSize: 12, color: COLORS.textMid }}>{assessment.score ? `${assessment.score}%` : assessment.status}</span>
                    </summary>
                    <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                      <div style={{ fontSize: 12, color: COLORS.textLight }}>{assessment.summary}</div>
                      <div style={{ fontSize: 12, color: COLORS.textMid }}>
                        {assessment.questionCount} questions · {assessment.durationMinutes} min · Passing {assessment.passingScore}%
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
