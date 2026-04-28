import { useMemo, useState } from "react";
import { COLORS } from "../styles/theme";
import { mockJobs, mockSkills } from "../data/mockData";
import SkillBar from "../components/SkillBar";
import { calculateMatchScore, getJobLocation } from "../utils/matching";
import { getSession } from "../../JobSeeker/hooks/useSession";

export default function ProfileView() {
  const [tab, setTab] = useState("skills");
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
  const companyAssessments = [
    {
      company: "NovaByte Solutions",
      location: "Davao City",
      assessments: [
        {
          id: "novabyte-1",
          title: "WordPress + Webflow Practical",
          score: 98,
          status: "Completed",
          date: "Apr 16, 2026",
          questionCount: 8,
          durationMinutes: 16,
          passingScore: 70,
          summary: "Site build, CMS structuring, responsive QA, and publish workflow.",
        },
        {
          id: "novabyte-2",
          title: "SEO Foundations",
          score: 92,
          status: "Completed",
          date: "Apr 14, 2026",
          questionCount: 10,
          durationMinutes: 14,
          passingScore: 75,
          summary: "Metadata, on-page optimization, and Core Web Vitals basics.",
        },
        {
          id: "novabyte-3",
          title: "UI/UX Case Study",
          score: null,
          status: "Invited",
          date: null,
          questionCount: 6,
          durationMinutes: 14,
          passingScore: 70,
          summary: "User flow mapping and landing page critique for SME clients.",
        },
      ],
    },
  ];
  // Badge proof model (code reference only): badges are verified signals earned via tasks,
  // scenario evaluations, or validated portfolio outputs. They improve matching for applicants
  // and help employers pre-screen and rank candidates by verified fit.
  return (
    <div style={{ padding:"28px 32px" }}>
      <div style={{
        background:`linear-gradient(110deg, ${COLORS.brownDeep}, ${COLORS.brownMid})`,
        borderRadius:16, padding:"28px 32px", marginBottom:24,
        display:"flex", gap:24, alignItems:"center", flexWrap:"wrap"
      }}>
        <div style={{
          width:80, height:80, borderRadius:"50%", background:`linear-gradient(135deg, ${COLORS.rust}, ${COLORS.gold})`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:28, fontWeight:700, color:"#FDF6E8", flexShrink:0,
          border:`3px solid ${COLORS.goldLight}66`
        }}>MS</div>
        <div style={{ flex:1 }}>
          <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:24, color:"#FDF6E8", marginBottom:4 }}>Maria Santos</h2>
          <p style={{ color:"rgba(253,246,232,0.7)", fontSize:13, marginBottom:10 }}>WordPress & Webflow Developer · Davao City, Philippines</p>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <span className="sbph-badge badge-verified">✓ Verified</span>
            <span style={{ background:"rgba(200,144,32,0.2)", color:COLORS.goldLight, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600 }}>⭐ 100% Avg Match</span>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {[["6","Badges"],["4","Applied"],["18","Profile Views"]].map(([v,l]) => (
            <div key={l} style={{ textAlign:"center", background:"rgba(253,246,232,0.07)", borderRadius:10, padding:"10px 16px" }}>
              <div style={{ fontFamily:"'Playfair Display', serif", fontSize:22, color:COLORS.goldLight, fontWeight:700 }}>{v}</div>
              <div style={{ fontSize:11, color:"rgba(253,246,232,0.6)" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:"flex", gap:4, marginBottom:22, borderBottom:`1px solid ${COLORS.parchmentDeep}`, paddingBottom:0 }}>
        {["skills","portfolio","matches","assessments"].map(t => (
          <button key={t} onClick={()=>setTab(t)} style={{
            padding:"10px 18px", border:"none", background:"transparent",
            fontSize:13, fontWeight: tab===t ? 600 : 400,
            color: tab===t ? COLORS.rust : COLORS.textLight,
            borderBottom: tab===t ? `2px solid ${COLORS.rust}` : "2px solid transparent",
            cursor:"pointer", fontFamily:"'DM Sans', sans-serif",
            textTransform:"capitalize", transition:"all 0.2s"
          }}>{t}</button>
        ))}
      </div>

      {tab === "skills" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:22 }}>
          <div style={{ background:COLORS.cream, borderRadius:12, padding:"22px 20px", border:`1px solid ${COLORS.parchmentDeep}` }}>
            <h4 style={{ fontFamily:"'Playfair Display', serif", fontSize:17, color:COLORS.brownDeep, marginBottom:18 }}>Verified Skill Badges (Proof of Skill)</h4>
            {mockSkills.map(s => <SkillBar key={s.name} skill={s} />)}
          </div>
          <div>
            <div style={{ background:COLORS.cream, borderRadius:12, padding:"22px 20px", border:`1px solid ${COLORS.parchmentDeep}`, marginBottom:16 }}>
              <h4 style={{ fontFamily:"'Playfair Display', serif", fontSize:17, color:COLORS.brownDeep, marginBottom:14 }}>Earned Badges</h4>
              <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                {mockSkills.filter(isBadgeVerified).map(s => (
                  <div key={s.name} style={{
                    background:`linear-gradient(135deg, ${COLORS.brownMid}, ${COLORS.rust})`,
                    borderRadius:12, padding:"14px 16px", textAlign:"center", minWidth:100,
                    border:`1px solid ${COLORS.rustBright}44`
                  }}>
                    <div style={{ fontSize:22, marginBottom:6 }}>🏅</div>
                    <div style={{ fontSize:11, fontWeight:600, color:COLORS.parchment }}>{s.badge}</div>
                    <div style={{ fontSize:10, color:COLORS.parchmentDark, marginTop:2 }}>{s.name.split("/")[0].trim()}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background:COLORS.cream, borderRadius:12, padding:"22px 20px", border:`1px solid ${COLORS.parchmentDeep}` }}>
              <h4 style={{ fontFamily:"'Playfair Display', serif", fontSize:17, color:COLORS.brownDeep, marginBottom:12 }}>Badge Pathways</h4>
              <p style={{ fontSize: 12, color: COLORS.textLight, marginTop: 0, marginBottom: 12 }}>
                Complete the assessment, scenario, or portfolio check to convert these into verified badges.
              </p>
              {mockSkills.filter((skill) => !isBadgeVerified(skill)).map(s => (
                <div key={s.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, padding:"10px 14px", background:COLORS.parchment, borderRadius:8 }}>
                  <span style={{ fontSize:13, color:COLORS.textDark }}>{s.name}</span>
                  <button style={{ padding:"5px 14px", borderRadius:6, background:COLORS.rust, border:"none", color:COLORS.cream, fontSize:11, fontWeight:600, cursor:"pointer" }}>{getBadgeActionLabel(s)}</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "portfolio" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:16 }}>
          {["WordPress Ecommerce Refresh","Webflow Landing System","SEO Audit Template","Restaurant Booking Site"].map(p => (
            <div key={p} className="card-hover" style={{
              background:COLORS.cream, borderRadius:12, border:`1px solid ${COLORS.parchmentDeep}`,
              overflow:"hidden", cursor:"pointer"
            }}>
              <div style={{ height:130, background:`linear-gradient(135deg, ${COLORS.brownMid}44, ${COLORS.rust}44)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <div style={{ fontSize:36 }}>💼</div>
              </div>
              <div style={{ padding:"14px 16px" }}>
                <div style={{ fontSize:14, fontWeight:600, color:COLORS.brownDeep }}>{p}</div>
                <div style={{ fontSize:12, color:COLORS.textLight, marginTop:4 }}>WordPress · Webflow · 2026</div>
              </div>
            </div>
          ))}
          <div className="card-hover" style={{
            background:"transparent", borderRadius:12, border:`2px dashed ${COLORS.parchmentDeep}`,
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
            padding:"40px 20px", cursor:"pointer", minHeight:200
          }}>
            <div style={{ fontSize:32, marginBottom:8 }}>+</div>
            <div style={{ fontSize:13, color:COLORS.textLight }}>Add Portfolio Item</div>
          </div>
        </div>
      )}

      {tab === "matches" && (
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.brownDeep }}>Matched jobs for you</div>
            <div style={{ fontSize: 12, color: COLORS.textMid, marginTop: 2 }}>
              Based on your skills, location, and experience level.
            </div>
          </div>
          {matchedJobs.length === 0 ? (
            <div style={{
              background: COLORS.cream,
              borderRadius: 12,
              padding: "18px 20px",
              border: `1px dashed ${COLORS.parchmentDeep}`,
              fontSize: 13,
              color: COLORS.textMid,
            }}>
              No matched jobs yet. Update your profile to unlock recommendations.
            </div>
          ) : (
            matchedJobs.map(({ job, match }) => {
              const status = job.title === "WordPress & Webflow Developer" ? "Applied" : "Saved";
              const statusClass = status === "Applied" ? "badge-open" : "badge-pending";
              return (
              <div key={job.id} style={{
                background: COLORS.cream,
                borderRadius: 12,
                padding: "18px 20px",
                border: `1px solid ${COLORS.parchmentDeep}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.brownDeep }}>{job.title}</div>
                  <div style={{ fontSize: 12, color: COLORS.textMid, marginTop: 3 }}>
                    {job.company || "Employer"} · {getJobLocation(job)}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    {(job.requiredSkills || []).slice(0, 3).map((skill) => (
                      <span key={skill} style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: COLORS.parchment,
                        fontSize: 11,
                        color: COLORS.textMid,
                        border: `1px solid ${COLORS.parchmentDeep}`,
                      }}>
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
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, color: match.score >= 85 ? COLORS.success : COLORS.gold }}>
                      {match.score}%
                    </div>
                    <div style={{ fontSize: 10, color: COLORS.textLight }}>match</div>
                  </div>
                  <button style={{
                    padding: "7px 14px",
                    borderRadius: 7,
                    background: COLORS.rust,
                    border: "none",
                    color: COLORS.cream,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}>
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
            <div key={company.company} style={{
              background: COLORS.cream,
              borderRadius: 12,
              padding: "18px 20px",
              border: `1.5px solid ${COLORS.parchmentDeep}`,
              display: "grid",
              gap: 12,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.brownDeep }}>{company.company}</div>
                  <div style={{ fontSize: 12, color: COLORS.textLight, marginTop: 4 }}>{company.location}</div>
                </div>
                <span style={{ fontSize: 12, color: COLORS.textMid }}>{company.assessments.length} assessment(s)</span>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {company.assessments.map((assessment) => (
                  <details key={assessment.id} style={{
                    borderRadius: 10,
                    border: `1px solid ${COLORS.parchmentDeep}`,
                    background: COLORS.parchment,
                    padding: "12px 14px",
                  }}>
                    <summary style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      fontSize: 13,
                      fontWeight: 600,
                      color: COLORS.brownDeep,
                      cursor: "pointer",
                      listStyle: "none",
                    }}>
                      <span>
                        {company.company} - {assessment.title}
                      </span>
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
                            padding: "7px 14px",
                            borderRadius: 7,
                            background: assessment.status === "Available" ? COLORS.rust : COLORS.parchmentDeep,
                            border: "none",
                            color: assessment.status === "Available" ? COLORS.cream : COLORS.textLight,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: assessment.status === "Available" ? "pointer" : "default",
                            fontFamily: "'DM Sans', sans-serif",
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
