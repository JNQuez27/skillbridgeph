import { COLORS } from "../styles/ui";
import { IconCheck } from "./Icons";

// Patent Fig. 5, step 530: the automatic pre-check. It informs the admin's
// decision (535-545); it never validates a company on its own.
const LOOK = {
  pass: { mark: <IconCheck size={13} />, bg: "#DCFCE7", color: "#15803D", text: "Passed" },
  fail: { mark: "✕", bg: "#FEE2E2", color: "#B91C1C", text: "Failed" },
  unknown: { mark: "?", bg: "#FEF3C7", color: "#92400E", text: "Check by eye" },
};

export default function PreCheckList({ checks, title = "Automatic pre-check", showDetail = true }) {
  if (!checks || checks.length === 0) return null;
  const passed = checks.filter((c) => c.result === "pass").length;
  return (
    <div style={{ border: `1px solid ${COLORS.parchmentDeep}`, borderRadius: 10, padding: "10px 12px", background: COLORS.parchment, display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", fontSize: 12 }}>
        <strong style={{ color: COLORS.brownDeep }}>{title}</strong>
        <span style={{ color: COLORS.textMid }}>{passed} of {checks.length} passed</span>
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
        {checks.map((c) => {
          const look = LOOK[c.result] || LOOK.unknown;
          return (
            <li key={c.key} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span aria-hidden="true" style={{ width: 20, height: 20, borderRadius: "50%", background: look.bg, color: look.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{look.mark}</span>
              <span style={{ fontSize: 12, color: COLORS.textDark }}>
                <span style={{ fontWeight: 600 }}>{c.label}</span>
                <span style={{ color: look.color, fontWeight: 700 }}> · {look.text}</span>
                {showDetail && <span style={{ display: "block", color: COLORS.textLight }}>{c.detail}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
