import { useMemo, useState } from "react";
import { skillGroups, skillOptions } from "../data/jobSeekerData";

// The applicant picks a field first; only that field's skills are offered, so an IT
// applicant never sees Barista and a cafe worker never sees Laravel.
// Used by onboarding and by Profile Settings on the dashboard.
const lower = (s) => s.toLowerCase();

function Chip({ on, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={`min-h-9 rounded-full border px-3 text-xs font-semibold transition ${on ? "border-[#ECA406] bg-[#FFF3D6] text-neutral-900" : "border-neutral-200 bg-white text-neutral-700 hover:border-[#ECA406]"}`}>
      {on ? "✓ " : "+ "}{children}
    </button>
  );
}

// value / onChange: the selected skill names. known: skills that only guide the starting
// field (e.g. verified badges) and are never removed here.
export default function SkillFieldPicker({ value, onChange, suggestedSkills = [], known = [] }) {
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState(() => {
    const own = [...value, ...known].map(lower);
    const best = skillGroups.map((g) => [g.name, g.skills.filter((s) => own.includes(lower(s))).length]).sort((a, b) => b[1] - a[1])[0];
    return best && best[1] > 0 ? best[0] : null;
  });
  const fieldSkills = useMemo(() => {
    const held = known.map(lower);
    const list = (skillGroups.find((g) => g.name === group)?.skills || []).filter((s) => !held.includes(lower(s)));
    const hot = new Set(suggestedSkills.map(lower));
    return [...list].sort((a, b) => hot.has(lower(b)) - hot.has(lower(a))); // in-demand first
  }, [group, suggestedSkills, known]);

  const has = (name) => value.some((s) => lower(s) === lower(name));
  const toggle = (name) => onChange(has(name) ? value.filter((s) => lower(s) !== lower(name)) : [...value, name]);
  const pickField = (name) => {
    const keep = skillGroups.find((g) => g.name === name).skills.map(lower);
    const all = skillOptions.map(lower);
    // Drop picks from the old field; typed-in custom skills stay.
    onChange(value.filter((s) => keep.includes(lower(s)) || !all.includes(lower(s))));
    setGroup(name);
    setSearch("");
  };

  const typed = lower(search.trim());
  const suggestions = typed ? fieldSkills.filter((s) => lower(s).includes(typed)) : fieldSkills;
  // A skill that belongs to another field (e.g. Barista while in IT) can't be typed in either.
  const otherField = typed && !fieldSkills.some((s) => lower(s) === typed) && skillOptions.some((s) => lower(s) === typed);
  const canAddTyped = typed && !otherField && !has(search.trim()) && !suggestions.some((s) => lower(s) === typed);
  const extra = value.filter((s) => !suggestions.some((x) => lower(x) === lower(s)));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-3 text-sm font-semibold text-neutral-900">What field do you work in?</p>
        <div role="radiogroup" aria-label="Your field" className="flex flex-wrap gap-2">
          {skillGroups.map((g) => (
            <button key={g.name} type="button" role="radio" aria-checked={group === g.name} onClick={() => pickField(g.name)}
              className={`min-h-9 rounded-full px-3 text-xs font-bold transition ${group === g.name ? "bg-[#ECA406] text-white" : "bg-[#FFF6E0] text-neutral-900 hover:bg-[#FDF0D0]"}`}>
              {g.name}
            </button>
          ))}
        </div>
      </div>
      {group && (
        <>
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-semibold text-neutral-900">Find a skill in {group}</span>
            <input id="skill-search" type="text" placeholder="Search skills, tools, or strengths" value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 focus:border-[#ECA406] focus:outline-none focus:ring-2 focus:ring-[#ECA406]/30" />
          </label>
          <div>
            <p className="mb-3 text-sm font-semibold text-neutral-900">{search ? "Matching skills" : `${group} skills`}</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => <Chip key={s} on={has(s)} onClick={() => toggle(s)}>{s}</Chip>)}
              {canAddTyped && <Chip on={false} onClick={() => { toggle(search.trim()); setSearch(""); }}>Add “{search.trim()}”</Chip>}
            </div>
            {otherField && <p className="mt-2 text-xs text-neutral-600">“{search.trim()}” belongs to another field. Change your field above to add it.</p>}
            {extra.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {extra.map((s) => <Chip key={s} on onClick={() => toggle(s)}>{s}</Chip>)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
