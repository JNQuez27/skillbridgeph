import { IconCheck } from "./Icons";

const METHOD = { assessment: "assessment", portfolio: "evidence review", scenario: "scenario", registry: "official registry check" };

// Trust level, weakest to strongest: self-reported < assessment < employer-confirmed < registry.
const TIER = { assessment: "Assessment-verified", scenario: "Assessment-verified", portfolio: "Employer-confirmed", registry: "Registry-verified" };

/**
 * One skill with its provenance. A verified skill always says who verified it,
 * how and when; anything else is labelled self-reported, so a reader never has
 * to guess which claims are backed.
 */
export default function SkillBar({ skill, action = null }) {
  const isVerified = skill.verificationStatus === "verified";
  const isUnverified = skill.verificationStatus === "unverified";
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#0C4A6E" }}>{skill.name}</span>
          {isVerified ? (
            <span className="sbph-badge" style={{ fontSize: 12, gap: 4, background: "#DCFCE7", color: "#15803D" }}>
              <IconCheck size={10} /> {TIER[skill.verificationMethod] || "Verified"}
            </span>
          ) : isUnverified ? (
            <span className="sbph-badge" style={{ fontSize: 12, background: "#FEE2E2", color: "#B91C1C" }}>
              Unverified
            </span>
          ) : skill.evidenced ? (
            <span className="sbph-badge" style={{ fontSize: 12, background: "#E0F2FE", color: "#075985" }}>
              Self-reported + work sample
            </span>
          ) : (
            <span className="sbph-badge" style={{ fontSize: 12, background: "#F1F5F9", color: "#475569" }}>
              Self-reported
            </span>
          )}
        </div>
        {isVerified ? <span style={{ fontSize: 12, fontWeight: 600, color: "#0369A1" }}>{skill.level}%</span> : action}
      </div>
      {/* Patent Fig. 20 (2026): a linked work sample is evidence the match score counts. */}
      {!isVerified && !isUnverified && skill.workSamples?.length > 0 && (
        <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>
          Work sample: {skill.workSamples.join(", ")} · {skill.evidenced
            ? "counts 80% in matching (a bare claim counts 60%; verify it for 100%)"
            : "does not count: the same file was uploaded by another account"}
        </div>
      )}
      {isVerified && (
        <>
          <div style={{ background: "#E0F2FE", borderRadius: 6, height: 6, overflow: "hidden" }}>
            <div style={{ width: `${skill.level}%`, height: "100%", borderRadius: 6, background: "linear-gradient(90deg, #0369A1, #16A34A)" }} />
          </div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
            {skill.verifiedBy ? `By ${skill.verifiedBy}` : "Verified"} via {METHOD[skill.verificationMethod] || skill.verificationMethod}
            {skill.verifiedAt ? ` · ${skill.verifiedAt}` : ""}
            {skill.evidence ? ` · evidence: ${skill.evidence}` : ""}
          </div>
          {skill.assessmentResult && (
            <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>
              Earned with: {skill.assessmentResult.assessment} · {skill.assessmentResult.score}% · {skill.assessmentResult.takenAt}
            </div>
          )}
          {skill.verificationId && (
            <div style={{ fontSize: 12, color: "#0C4A6E", marginTop: 2 }}>
              Verification ID <strong style={{ fontFamily: "ui-monospace, Consolas, monospace", letterSpacing: "0.04em" }}>{skill.verificationId}</strong>
            </div>
          )}
        </>
      )}
    </div>
  );
}
