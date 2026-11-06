import { Head } from "@inertiajs/react";
import { COLORS, FONT_DISPLAY, FONT_BODY } from "./SkillBridge/styles/ui";

const METHOD = { assessment: "Passed a company assessment", scenario: "Passed a company assessment", portfolio: "Work reviewed by an employer", registry: "Checked against an official registry" };

// Patent Fig. 21 (2106): the public badge verification page behind a shared link.
export default function VerifyBadge({ verificationId, badge }) {
  return (
    <div style={{ minHeight: "100vh", background: COLORS.parchment, fontFamily: FONT_BODY, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <Head title={badge ? `${badge.badge} - verification` : "Badge verification"} />
      <main style={{ width: "min(440px, 100%)", background: COLORS.cream, borderRadius: 18, border: `1px solid ${COLORS.parchmentDeep}`, boxShadow: "0 20px 44px rgba(12,74,110,0.14)", overflow: "hidden" }}>
        <div style={{ background: `linear-gradient(120deg, ${COLORS.brownDeep}, ${COLORS.brownMid})`, color: "#fff", padding: "18px 22px" }}>
          <div style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.85 }}>SkillBridge PH · badge verification</div>
          <div style={{ fontFamily: "ui-monospace, Consolas, monospace", fontSize: 15, marginTop: 6, letterSpacing: "0.04em" }}>{verificationId}</div>
        </div>
        {badge ? (
          <div style={{ padding: "20px 22px", display: "grid", gap: 12 }}>
            <div role="status" style={{ display: "flex", alignItems: "center", gap: 8, color: "#166534", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: "10px 12px", fontSize: 14, fontWeight: 700 }}>
              <span aria-hidden="true">✓</span> Verified badge
            </div>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: COLORS.brownDeep, margin: 0 }}>{badge.badge}</h1>
            <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 14px", fontSize: 14 }}>
              <dt style={{ color: COLORS.textLight }}>Holder</dt><dd style={{ margin: 0, fontWeight: 600, color: COLORS.textDark }}>{badge.holder}</dd>
              <dt style={{ color: COLORS.textLight }}>How</dt><dd style={{ margin: 0, color: COLORS.textDark }}>{METHOD[badge.method] || badge.method}{badge.assessment ? `: ${badge.assessment}` : ""}</dd>
              <dt style={{ color: COLORS.textLight }}>Verified by</dt><dd style={{ margin: 0, color: COLORS.textDark }}>{badge.verifiedBy}</dd>
              <dt style={{ color: COLORS.textLight }}>Date</dt><dd style={{ margin: 0, color: COLORS.textDark }}>{badge.verifiedAt}</dd>
              <dt style={{ color: COLORS.textLight }}>Score</dt><dd style={{ margin: 0, color: COLORS.textDark }}>{badge.level}%</dd>
            </dl>
            <p style={{ margin: 0, fontSize: 12, color: COLORS.textLight }}>This page is live: if the holder turns the link off, it stops showing the badge.</p>
          </div>
        ) : (
          <div style={{ padding: "20px 22px", display: "grid", gap: 8 }}>
            <h1 role="status" style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: COLORS.brownDeep, margin: 0 }}>No public badge with this ID</h1>
            <p style={{ margin: 0, fontSize: 14, color: COLORS.textMid }}>The ID may be mistyped, or its holder has not made the badge shareable. Ask them for a fresh link.</p>
          </div>
        )}
        <div style={{ padding: "12px 22px 18px" }}>
          <a href="/" style={{ fontSize: 13, color: COLORS.info, fontWeight: 600 }}>About SkillBridge PH</a>
        </div>
      </main>
    </div>
  );
}
