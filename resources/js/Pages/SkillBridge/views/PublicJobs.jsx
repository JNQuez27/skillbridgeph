import { useMemo, useState } from "react";
import { COLORS, FONT_DISPLAY, FONT_BODY } from "../styles/ui";
import { IconCheck } from "../components/Icons";

// Patent Fig. 2, 202: a guest can only browse. Open jobs from verified companies,
// with no match score and no apply until the visitor signs up.
const cardStyle = { background: COLORS.cream, borderRadius: 14, padding: "20px", border: `1px solid ${COLORS.parchmentDeep}` };
const inputStyle = { padding: "10px 12px", borderRadius: 10, border: `1px solid ${COLORS.parchmentDeep}`, background: COLORS.cream, fontSize: 13, color: COLORS.textDark, fontFamily: FONT_BODY };
const cta = { display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 40, padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", fontFamily: FONT_BODY };

export default function PublicJobs({ jobs }) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ workSetup: "", employmentType: "", city: "" });
  const cityOf = (j) => (j.location || "").split(",")[0].trim();
  const options = useMemo(() => {
    const uniq = (fn) => [...new Set(jobs.map(fn).filter(Boolean))].sort();
    return { workSetup: uniq((j) => j.workSetup), employmentType: uniq((j) => j.employmentType), city: uniq(cityOf) };
  }, [jobs]);
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs.filter((j) =>
      (!q || `${j.title} ${j.company} ${j.requiredSkills.join(" ")}`.toLowerCase().includes(q))
      && (!filters.workSetup || j.workSetup === filters.workSetup)
      && (!filters.employmentType || j.employmentType === filters.employmentType)
      && (!filters.city || cityOf(j) === filters.city));
  }, [jobs, search, filters]);

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 16px 48px", fontFamily: FONT_BODY }}>
      <div style={{ background: `linear-gradient(120deg, ${COLORS.brownDeep}, ${COLORS.brownMid})`, borderRadius: 18, padding: "26px 28px", marginBottom: 22, color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 600, margin: 0 }}>Open jobs</h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "rgba(224,242,254,0.88)" }}>
            {jobs.length} open role(s), all from companies SkillBridge PH has verified. Sign up to see your match and apply with your verified badges.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href="/login" style={{ ...cta, border: "1px solid rgba(255,255,255,0.5)", color: "#fff" }}>Sign in</a>
          <a href="/signup" style={{ ...cta, background: "#fff", color: COLORS.brownDeep }}>Sign up free</a>
        </div>
      </div>

      <div role="search" style={{ ...cardStyle, padding: "16px 18px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 10 }}>
        <label style={{ display: "grid", gap: 4, fontSize: 12, fontWeight: 600, color: COLORS.textMid, flex: "2 1 240px" }}>
          Search
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Title, company, or skill" style={inputStyle} />
        </label>
        {[["workSetup", "Work setup"], ["employmentType", "Job type"], ["city", "City"]].map(([key, label]) => (
          <label key={key} style={{ display: "grid", gap: 4, fontSize: 12, fontWeight: 600, color: COLORS.textMid, flex: "1 1 140px" }}>
            {label}
            <select value={filters[key]} onChange={(e) => setFilters({ ...filters, [key]: e.target.value })} style={inputStyle}>
              <option value="">Any</option>
              {options[key].map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
        ))}
      </div>
      <p aria-live="polite" style={{ fontSize: 12, color: COLORS.textLight, margin: "0 0 12px" }}>{shown.length} of {jobs.length} job(s)</p>

      <div style={{ display: "grid", gap: 12 }}>
        {shown.length === 0 && <div style={{ ...cardStyle, borderStyle: "dashed", fontSize: 13, color: COLORS.textMid }}>No jobs match these filters.</div>}
        {shown.map((j) => (
          <article key={j.id} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 320px", minWidth: 0 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: COLORS.brownDeep, margin: 0 }}>{j.title}</h2>
              <div style={{ fontSize: 13, color: COLORS.textMid, marginTop: 4, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>{j.company} <IconCheck size={13} color={COLORS.success} aria-label="Verified company" /></span>
                <span>· {[j.location, j.workSetup, j.employmentType, j.salaryRange].filter(Boolean).join(" · ")}</span>
              </div>
              <ul aria-label="Skills this job asks for" style={{ display: "flex", gap: 6, flexWrap: "wrap", listStyle: "none", padding: 0, margin: "10px 0 0" }}>
                {j.requiredSkills.map((s) => <li key={s} style={{ padding: "4px 10px", borderRadius: 999, background: COLORS.parchment, border: `1px solid ${COLORS.parchmentDeep}`, fontSize: 12, color: COLORS.textMid }}>{s}</li>)}
                {j.preferredSkills.map((s) => <li key={s} style={{ padding: "4px 10px", borderRadius: 999, border: `1px dashed ${COLORS.parchmentDeep}`, fontSize: 12, color: COLORS.textLight }}>{s} (preferred)</li>)}
              </ul>
              {j.assessment && <div style={{ fontSize: 12, color: COLORS.textMid, marginTop: 8 }}>Asks for the <strong>{j.assessment}</strong> assessment.</div>}
              <div style={{ fontSize: 12, color: COLORS.textLight, marginTop: 6 }}>Posted {j.postedAt}</div>
            </div>
            <a href="/signup" style={{ ...cta, background: COLORS.info, color: "#fff" }}>Sign up to apply</a>
          </article>
        ))}
      </div>
    </div>
  );
}
