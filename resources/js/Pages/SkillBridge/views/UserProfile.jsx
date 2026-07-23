import { useMemo } from "react";
import { mockJobs, mockSkills } from "../data/mockData";
import SkillBar from "../components/SkillBar";
import { calculateMatchScore, getJobLocation } from "../utils/matching";
import { getSession } from "../../JobSeeker/hooks/useSession";
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

// Local blue + green brand palette (matches the public dashboard). theme.js and
// the shared header are left untouched.
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
  gold: "#16A34A",
  goldLight: "#4ADE80",
  info: "#0369A1",
};

const FONT_DISPLAY = "'Lexend', sans-serif";
const FONT_BODY = "'Source Sans 3', sans-serif";

const sectionMeta = {
  skills: { label: "Skills & Badges", sub: "Your verified proof of skill.", Icon: IconZap },
  portfolio: { label: "Portfolio", sub: "Selected work and case studies.", Icon: IconBriefcase },
  matches: { label: "Job Matches", sub: "Roles aligned to your verified skills.", Icon: IconTarget },
  assessments: { label: "Assessments", sub: "Company assessments and results.", Icon: IconClipboardCheck },
};

export default function ProfileView({ activeTab = "skills" }) {
  const tab = sectionMeta[activeTab] ? activeTab : "skills";
  const session = useMemo(() => getSession(), []);
  const applicantProfile = useMemo(() => {
    if (session?.applicantProfile) return session.applicantProfile;
    const verifiedSkills = mockSkills
      .filter((skill) => skill.verification?.status === "verified")
      .map((skill) => skill.name);
    return {
      name: session?.name || "Maria Santos",
      location: session?.location || "Davao City, Philippines",
      skills: mockSkills.map((skill) => skill.name),
      verifiedSkills,
      experienceLevel: "Entry",
    };
  }, [session]);
  const availableJobs = useMemo(() => {
    const savedJobs = session?.employerJobs;
    if (Array.isArray(savedJobs) && savedJobs.length > 0) {
      const mergedJobs = [...savedJobs];
      mockJobs.forEach((job) => {
        const exists = mergedJobs.some((saved) => (
          saved.title === job.title && (saved.company || "NovaByte Solutions") === job.company
        ));
        if (!exists) mergedJobs.push(job);
      });
      return mergedJobs;
    }
    return mockJobs;
  }, [session]);
  const matchingProfile = useMemo(() => {
    const fallbackSkills = mockSkills.map((skill) => skill.name);
    const fallbackVerified = mockSkills
      .filter((skill) => skill.verification?.status === "verified")
      .map((skill) => skill.name);
    return {
      ...applicantProfile,
      location: applicantProfile.location || "Davao City, Philippines",
      skills: Array.isArray(applicantProfile.skills) && applicantProfile.skills.length > 0
        ? applicantProfile.skills
        : fallbackSkills,
      verifiedSkills: Array.isArray(applicantProfile.verifiedSkills) && applicantProfile.verifiedSkills.length > 0
        ? applicantProfile.verifiedSkills
        : fallbackVerified,
      experienceLevel: applicantProfile.experienceLevel || "Entry",
    };
  }, [applicantProfile]);

  const matchedJobs = useMemo(() => (
    availableJobs
      .map((job) => ({ job, match: calculateMatchScore(job, matchingProfile) }))
      .filter((entry) => entry.match.score >= 60)
      .sort((a, b) => b.match.score - a.match.score)
  ), [availableJobs, matchingProfile]);
  const isBadgeVerified = (skill) => skill.verification?.status === "verified";
  const getBadgeActionLabel = (skill) => {
    const method = skill.verification?.method;
    if (method === "portfolio") return "Submit Portfolio";
    if (method === "scenario") return "Start Scenario";
    return "Take Assessment";
  };

  const initials = (applicantProfile.name || "User")
    .split(" ").filter(Boolean).map((word) => word[0]).slice(0, 2).join("").toUpperCase() || "U";

  const companyAssessments = [
    {
      company: "NovaByte Solutions",
      location: "Davao City",
      assessments: [
        { id: "novabyte-1", title: "WordPress + Webflow Practical", score: 98, status: "Completed", date: "Apr 16, 2026", questionCount: 8, durationMinutes: 16, passingScore: 70, summary: "Site build, CMS structuring, responsive QA, and publish workflow." },
        { id: "novabyte-2", title: "SEO Foundations", score: 92, status: "Completed", date: "Apr 14, 2026", questionCount: 10, durationMinutes: 14, passingScore: 75, summary: "Metadata, on-page optimization, and Core Web Vitals basics." },
        { id: "novabyte-3", title: "UI/UX Case Study", score: null, status: "Invited", date: null, questionCount: 6, durationMinutes: 14, passingScore: 70, summary: "User flow mapping and landing page critique for SME clients." },
      ],
    },
  ];

  const SectionIcon = sectionMeta[tab].Icon;
  const cardStyle = { background: COLORS.cream, borderRadius: 14, padding: "22px 20px", border: `1px solid ${COLORS.parchmentDeep}` };
  const headingStyle = { fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 600, color: COLORS.brownDeep, marginBottom: 14 };

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
        }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 600, color: "#fff", marginBottom: 4 }}>
            {applicantProfile.name}
          </h2>
          <p style={{ color: "rgba(224,242,254,0.85)", fontSize: 13, marginBottom: 12 }}>
            WordPress &amp; Webflow Developer
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(34,197,94,0.18)", color: COLORS.goldLight, padding: "4px 11px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
              <IconCheck size={12} /> Verified
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.12)", color: "#fff", padding: "4px 11px", borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
              <IconStar size={12} /> 100% Avg Match
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "rgba(224,242,254,0.8)", fontSize: 12 }}>
              <IconMapPin size={13} /> {applicantProfile.location}
            </span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {[["6", "Badges"], ["4", "Applied"], ["18", "Profile Views"]].map(([v, l]) => (
            <div key={l} style={{ textAlign: "center", background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 16px", minWidth: 76 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: COLORS.goldLight, fontWeight: 700 }}>{v}</div>
              <div style={{ fontSize: 11, color: "rgba(224,242,254,0.7)" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Section heading (sections are switched from the profile menu) */}
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
            {mockSkills.map((s) => <SkillBar key={s.name} skill={s} />)}
          </div>
          <div>
            <div style={{ ...cardStyle, marginBottom: 16 }}>
              <h4 style={headingStyle}>Earned Badges</h4>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {mockSkills.filter(isBadgeVerified).map((s) => (
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
              </div>
            </div>
            <div style={cardStyle}>
              <h4 style={headingStyle}>Badge Pathways</h4>
              <p style={{ fontSize: 12, color: COLORS.textLight, marginTop: 0, marginBottom: 12 }}>
                Complete the assessment, scenario, or portfolio check to convert these into verified badges.
              </p>
              {mockSkills.filter((skill) => !isBadgeVerified(skill)).map((s) => (
                <div key={s.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, padding: "10px 14px", background: COLORS.parchment, borderRadius: 10 }}>
                  <span style={{ fontSize: 13, color: COLORS.textDark }}>{s.name}</span>
                  <button style={{ padding: "6px 14px", borderRadius: 8, background: COLORS.info, border: "none", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: FONT_BODY }}>{getBadgeActionLabel(s)}</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "portfolio" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {["WordPress Ecommerce Refresh", "Webflow Landing System", "SEO Audit Template", "Restaurant Booking Site"].map((p) => (
            <div key={p} className="card-hover" style={{
              background: COLORS.cream, borderRadius: 14, border: `1px solid ${COLORS.parchmentDeep}`,
              overflow: "hidden", cursor: "pointer",
            }}>
              <div style={{ height: 130, background: `linear-gradient(135deg, ${COLORS.brownMid}, ${COLORS.info})`, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.9)" }}>
                <IconBriefcase size={34} />
              </div>
              <div style={{ padding: "14px 16px" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.brownDeep }}>{p}</div>
                <div style={{ fontSize: 12, color: COLORS.textLight, marginTop: 4 }}>WordPress · Webflow · 2026</div>
              </div>
            </div>
          ))}
          <div className="card-hover" style={{
            background: "transparent", borderRadius: 14, border: `2px dashed ${COLORS.parchmentDeep}`,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: "40px 20px", cursor: "pointer", minHeight: 200, color: COLORS.textLight,
          }}>
            <IconPlus size={30} />
            <div style={{ fontSize: 13, marginTop: 8 }}>Add Portfolio Item</div>
          </div>
        </div>
      )}

      {tab === "matches" && (
        <div style={{ display: "grid", gap: 12 }}>
          {matchedJobs.length === 0 ? (
            <div style={{ background: COLORS.cream, borderRadius: 14, padding: "18px 20px", border: `1px dashed ${COLORS.parchmentDeep}`, fontSize: 13, color: COLORS.textMid }}>
              No matched jobs yet. Update your profile to unlock recommendations.
            </div>
          ) : (
            matchedJobs.map(({ job, match }) => {
              const status = job.title === "WordPress & Webflow Developer" ? "Applied" : "Saved";
              const statusClass = status === "Applied" ? "badge-open" : "badge-pending";
              return (
                <div key={job.id} style={{ background: COLORS.cream, borderRadius: 14, padding: "18px 20px", border: `1px solid ${COLORS.parchmentDeep}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.brownDeep }}>{job.title}</div>
                    <div style={{ fontSize: 12, color: COLORS.textMid, marginTop: 3 }}>
                      {job.company || "Employer"} · {getJobLocation(job)}
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                      {(job.requiredSkills || []).slice(0, 3).map((skill) => (
                        <span key={skill} style={{ padding: "4px 10px", borderRadius: 999, background: COLORS.parchment, fontSize: 11, color: COLORS.textMid, border: `1px solid ${COLORS.parchmentDeep}` }}>
                          {skill}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: COLORS.textLight, marginTop: 6 }}>
                      Required {match.matchedRequired.length}/{(job.requiredSkills || []).length || 0} ·
                      Preferred {match.matchedPreferred.length}/{(job.preferredSkills || []).length || 0} ·
                      Location {match.locationMatch ? "Yes" : "No"} ·
                      Experience {match.experienceMatch ? "Yes" : "No"}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, color: COLORS.textLight }}>{job.posted || "Just now"}</span>
                      <span className={`sbph-badge ${statusClass}`}>{status}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, color: match.score >= 85 ? COLORS.success : COLORS.info }}>
                        {match.score}%
                      </div>
                      <div style={{ fontSize: 10, color: COLORS.textLight }}>match</div>
                    </div>
                    <button style={{ padding: "8px 14px", borderRadius: 8, background: COLORS.info, border: "none", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT_BODY }}>
                      View job
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "assessments" && (
        <div style={{ display: "grid", gap: 16 }}>
          {companyAssessments.map((company) => (
            <div key={company.company} style={{ background: COLORS.cream, borderRadius: 14, padding: "18px 20px", border: `1px solid ${COLORS.parchmentDeep}`, display: "grid", gap: 12 }}>
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
                      <span style={{ fontSize: 12, color: COLORS.textMid }}>
                        {assessment.score ? `${assessment.score}%` : assessment.status}
                      </span>
                    </summary>
                    <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                      <div style={{ fontSize: 12, color: COLORS.textLight }}>{assessment.summary}</div>
                      <div style={{ fontSize: 12, color: COLORS.textMid }}>
                        {assessment.questionCount} questions · {assessment.durationMinutes} min · Passing {assessment.passingScore}%
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <span className={`sbph-badge ${assessment.status === "Completed" ? "badge-verified" : assessment.status === "Available" ? "badge-open" : "badge-pending"}`}>
                          {assessment.status}
                        </span>
                        {assessment.status === "Completed" ? (
                          <span style={{ fontSize: 11, color: COLORS.textLight }}>Taken {assessment.date}</span>
                        ) : (
                          <button style={{
                            padding: "7px 14px", borderRadius: 8,
                            background: assessment.status === "Available" ? COLORS.info : COLORS.parchmentDeep,
                            border: "none",
                            color: assessment.status === "Available" ? "#fff" : COLORS.textLight,
                            fontSize: 12, fontWeight: 600,
                            cursor: assessment.status === "Available" ? "pointer" : "default",
                            fontFamily: FONT_BODY,
                          }}>
                            {assessment.status === "Available" ? "Start Assessment" : "Awaiting access"}
                          </button>
                        )}
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
