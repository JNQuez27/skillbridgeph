// The one recorded registry result for a certificate. Every viewer (the holder
// and every employer) sees the same line, so nobody has to re-check it.
const TONE = {
  verified: { bg: "#DCFCE7", color: "#15803D", text: (r) => `Confirmed in the ${r.label}${r.checkedAt ? ` · ${r.checkedAt}` : ""}` },
  pending: { bg: "#E0F2FE", color: "#075985", text: (r) => `Waiting for a ${r.label} check by SkillBridge PH` },
  rejected: { bg: "#FEE2E2", color: "#B91C1C", text: (r) => `Not confirmed in the ${r.label}${r.note ? ` — ${r.note}` : ""}` },
};

export default function RegistryStatus({ registry }) {
  if (!registry) return null;
  const t = TONE[registry.status] || TONE.pending;
  return (
    <div style={{ fontSize: 12, fontWeight: 600, padding: "6px 10px", borderRadius: 8, background: t.bg, color: t.color }}>
      {registry.qualification} · {t.text(registry)}
    </div>
  );
}
