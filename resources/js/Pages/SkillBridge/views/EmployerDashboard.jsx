import { COLORS, FONT_DISPLAY, FONT_BODY } from "../styles/ui";
import { useMemo, useState } from "react";
import { router, useForm } from "@inertiajs/react";
import SkillBar from "../components/SkillBar";
import RegistryStatus from "../components/RegistryStatus";
import PreCheckList from "../components/PreCheckList";
import {
  IconCheck,
  IconPlus,
  IconStar,
  IconMapPin,
  IconBriefcase,
  IconBuilding,
} from "../components/Icons";


const sectionMeta = {
  "job-offers": { label: "Job Offers", sub: "Post roles and manage your open positions." },
  assessments: { label: "Assessments", sub: "Create skill assessments candidates take to verify badges." },
  applicants: { label: "Applicants", sub: "Everyone who applied to your jobs or accepted an invite." },
  matches: { label: "Candidate Matches", sub: "Applicants who apply appear automatically; strong skill matches are suggested too." },
  analytics: { label: "Analytics", sub: "Track applicants and in-demand skills across your roles." },
  company: { label: "Company Profile", sub: "Manage your company details and verification." },
};

const cardStyle = { background: COLORS.cream, borderRadius: 14, padding: "22px 20px", border: `1px solid ${COLORS.parchmentDeep}` };
const headingStyle = { fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 600, color: COLORS.brownDeep, marginBottom: 14 };
const primaryBtn = { padding: "8px 14px", borderRadius: 8, background: COLORS.info, border: "none", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT_BODY, display: "inline-flex", alignItems: "center", gap: 6 };
const ghostBtn = { padding: "8px 14px", borderRadius: 8, background: "transparent", border: `1px solid ${COLORS.parchmentDeep}`, color: COLORS.brownDeep, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT_BODY };
const inputStyle = { padding: "10px 12px", borderRadius: 10, border: `1px solid ${COLORS.parchmentDeep}`, background: COLORS.cream, fontSize: 13, color: COLORS.textDark, fontFamily: FONT_BODY };

const companyInitials = (name) => {
  const parts = (name || "").split(" ").filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]).join("").toUpperCase() || "C";
};

const STATUS_META = {
  applied: { label: "Applied", bg: "rgba(22,163,74,0.14)", color: "#15803D" },
  invited: { label: "Invited", bg: "rgba(124,58,237,0.14)", color: "#7C3AED" },
  shortlisted: { label: "Shortlisted", bg: "rgba(3,105,161,0.14)", color: "#0369A1" },
  interviewing: { label: "Interviewing", bg: "rgba(180,83,9,0.14)", color: "#B45309" },
  hired: { label: "Hired", bg: "rgba(22,163,74,0.14)", color: "#15803D" },
  not_selected: { label: "Not selected", bg: "rgba(71,85,105,0.12)", color: "#475569" },
  declined: { label: "Declined invitation", bg: "rgba(71,85,105,0.12)", color: "#475569" },
};

const ASSESSMENT_STATE = {
  passed: { label: "Passed", color: "#15803D" },
  failed: { label: "Did not pass (no attempts left)", color: "#B91C1C" },
  in_progress: { label: "Attempted, not passed yet", color: "#B45309" },
  not_taken: { label: "Not taken yet", color: "#475569" },
};

function Modal({ title, eyebrow, onClose, children }) {
  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(12, 74, 110, 0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 60,
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

/**
 * Provenance signals for a candidate. Intentionally descriptive, never a
 * real/fake verdict — AI-text detection is unreliable and biased against
 * non-native English writers, so the employer judges these themselves.
 */
function VerificationSignals({ signals }) {
  if (!signals) return null;
  const chip = (text, tone) => (
    <span key={text} style={{
      padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600,
      background: tone === "warn" ? "rgba(180,83,9,0.12)" : tone === "good" ? "rgba(22,163,74,0.12)" : COLORS.parchmentDark,
      color: tone === "warn" ? "#B45309" : tone === "good" ? "#15803D" : COLORS.textMid,
    }}>{text}</span>
  );
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
      {chip(`${signals.verifiedSkills}/${signals.claimedSkills} skills verified`, signals.verifiedSkills > 0 ? "good" : "neutral")}
      {chip(`${signals.credentials} credential(s)`, "neutral")}
      {signals.docSupportedSkills > 0 && chip(`${signals.docSupportedSkills} backed by documents`, "good")}
      {signals.duplicateDocument && chip("document reused by another account", "warn")}
      {signals.demoVideo && (signals.demoVideo.livePrompts
        ? chip(`demo video: ${signals.demoVideo.livePrompts} live prompts`, "neutral")
        : chip("demo video not recorded live", "warn"))}
    </div>
  );
}

const VERDICT = {
  green: { label: "Checks passed", bg: "rgba(22,163,74,0.12)", color: "#15803D" },
  amber: { label: "Needs a look", bg: "rgba(180,83,9,0.12)", color: "#B45309" },
  red: { label: "Review required", bg: "rgba(185,28,28,0.12)", color: "#B91C1C" },
};

// Explainable verdict: always shows why. Never claims a document is authentic.
function ReviewVerdict({ review }) {
  if (!review) return null;
  const v = VERDICT[review.status] || VERDICT.amber;
  return (
    <div style={{ marginTop: 6 }}>
      <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: v.bg, color: v.color }}>{v.label}</span>
      <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
        {(review.reasons || []).map((r, i) => (
          <li key={i} style={{ fontSize: 12, color: COLORS.textLight }}>{r.text}</li>
        ))}
      </ul>
    </div>
  );
}

function Field({ label, error, hint, children }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 12, color: COLORS.textLight }}>{hint}</span>}
      {error && <span role="alert" style={{ fontSize: 12, color: "#B91C1C" }}>{error}</span>}
    </label>
  );
}

/**
 * Structured interview: the same questions for every candidate of a role, each
 * scored 1-5 against written anchors. Without a candidate it is a read-only
 * preview of the kit; with one, the employer records the interview.
 */
function InterviewKitModal({ job, candidate, doNotAsk, onClose }) {
  const kit = job?.interviewKit || [];
  const saved = candidate?.interview?.ratings || [];
  const [ratings, setRatings] = useState(() => kit.map((_, i) => ({ score: saved[i]?.score ?? null, note: saved[i]?.note ?? "" })));
  const [saving, setSaving] = useState(false);
  const hasVideo = (candidate?.credentials || []).some((c) => c.type === "video");
  const [videoMatch, setVideoMatch] = useState(candidate?.interview?.videoMatch ?? null);
  const [liveTask, setLiveTask] = useState(candidate?.interview?.liveTask ?? null);
  const scored = ratings.filter((r) => r.score).length;
  const average = scored ? (ratings.reduce((sum, r) => sum + (r.score || 0), 0) / scored).toFixed(1) : null;
  const setRating = (i, patch) => setRatings((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const save = () => {
    setSaving(true);
    router.post(`/job-posts/${job.id}/interview/${candidate.id}`, { ratings, ...(hasVideo ? { videoMatch, liveTask } : {}) }, {
      preserveScroll: true, onSuccess: onClose, onFinish: () => setSaving(false),
    });
  };

  return (
    <Modal eyebrow={candidate ? "Structured interview" : "Interview kit"} title={candidate ? `${candidate.name} - ${job.title}` : job.title} onClose={onClose}>
      <div style={{ fontSize: 12, color: COLORS.textMid }}>
        Ask every candidate these {kit.length} questions in this order, then score each answer 1-5 using the guide.
        Same questions and the same scale for everyone keeps the comparison fair.
      </div>
      <div style={{ border: "1px solid rgba(180,83,9,0.3)", background: "rgba(180,83,9,0.07)", borderRadius: 10, padding: "10px 12px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#92400E", marginBottom: 4 }}>Do not ask about</div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {(doNotAsk || []).map((d) => <li key={d} style={{ fontSize: 12, color: "#92400E" }}>{d}</li>)}
        </ul>
      </div>
      {kit.map((q, i) => (
        <fieldset key={i} style={{ border: `1px solid ${COLORS.parchmentDeep}`, borderRadius: 10, padding: "12px 14px", display: "grid", gap: 8, background: COLORS.parchment }}>
          <legend style={{ fontSize: 12, fontWeight: 700, color: COLORS.info, padding: "0 6px" }}>{i + 1}. {q.competency}</legend>
          <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.brownDeep }}>{q.question}</div>
          <div style={{ display: "grid", gap: 2 }}>
            {[1, 3, 5].map((n) => (
              <div key={n} style={{ fontSize: 12, color: COLORS.textMid }}><strong>{n}</strong> - {q.anchors[n]}</div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: COLORS.textLight }}>Source: {q.source}</div>
          {candidate && (
            <>
              <div role="radiogroup" aria-label={`Score for question ${i + 1}`} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={ratings[i].score === n} onClick={() => setRating(i, { score: n })}
                    style={{ ...ghostBtn, minWidth: 44, justifyContent: "center", background: ratings[i].score === n ? COLORS.info : "transparent", color: ratings[i].score === n ? "#fff" : COLORS.brownDeep }}>
                    {n}
                  </button>
                ))}
              </div>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Notes (what they actually said)</span>
                <input value={ratings[i].note} onChange={(e) => setRating(i, { note: e.target.value })} maxLength={500} style={inputStyle} />
              </label>
            </>
          )}
        </fieldset>
      ))}
      {candidate && hasVideo && (
        <fieldset style={{ border: "1px solid rgba(180,83,9,0.3)", borderRadius: 10, padding: "12px 14px", display: "grid", gap: 10, background: "rgba(180,83,9,0.05)" }}>
          <legend style={{ fontSize: 12, fontWeight: 700, color: "#92400E", padding: "0 6px" }}>Live check of the demo video</legend>
          <div style={{ fontSize: 12, color: COLORS.textMid }}>
            A video can be faked or performed by someone else. Compare it with the person in front of you, and ask them to repeat part of the task live.
            Skills shown only in the video can be confirmed after both answers are Yes.
          </div>
          {[
            ["Is the person you are interviewing the person in the demo video?", videoMatch, setVideoMatch, [["match", "Yes, same person"], ["mismatch", "No, a different person"]]],
            ["Did they repeat part of the task live, as in the video?", liveTask, setLiveTask, [[true, "Yes"], [false, "No / not checked"]]],
          ].map(([label, value, set, options]) => (
            <div key={label} role="radiogroup" aria-label={label} style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.brownDeep }}>{label}</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {options.map(([v, text]) => (
                  <button key={String(v)} type="button" role="radio" aria-checked={value === v} onClick={() => set(v)}
                    style={{ ...ghostBtn, minHeight: 44, background: value === v ? (v === "mismatch" || v === false ? "#B45309" : COLORS.info) : "transparent", color: value === v ? "#fff" : COLORS.brownDeep }}>
                    {text}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {videoMatch === "mismatch" && (
            <div role="alert" style={{ fontSize: 12, fontWeight: 700, color: "#B91C1C" }}>Saving this marks the candidate Red for this role.</div>
          )}
        </fieldset>
      )}
      {candidate && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: COLORS.textMid }}>
            {scored} of {kit.length} scored{average ? ` · average ${average} / 5` : ""}
          </span>
          <button type="button" style={{ ...primaryBtn, opacity: scored < kit.length || saving ? 0.6 : 1 }} disabled={scored < kit.length || saving} onClick={save}>
            {saving ? "Saving…" : "Save interview"}
          </button>
        </div>
      )}
    </Modal>
  );
}

const mmss = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

function InterviewChip({ interview }) {
  if (!interview) return null;
  return (
    <span title={`Interviewed by ${interview.by || "employer"} on ${interview.at}`}
      style={{ padding: "2px 9px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: "rgba(3,105,161,0.12)", color: "#075985" }}>
      Interview {Number(interview.score).toFixed(1)} / 5
    </span>
  );
}

// Fig. 17: engaged candidates, then suggestions ranked by match with a dashed
// line under the top ten (1712), the set "Invite top 10" invites (1724).
function rankedRows(candidates) {
  const engaged = candidates.filter((c) => c.status && c.status !== "declined");
  const suggested = candidates.filter((c) => !c.status);
  const declined = candidates.filter((c) => c.status === "declined");
  const rows = [];
  if (engaged.length) rows.push({ marker: true, key: "h-engaged", label: `Applied or invited (${engaged.length})` });
  engaged.forEach((c) => rows.push({ c }));
  if (suggested.length) rows.push({ marker: true, key: "h-suggested", label: `Suggested, ranked by match (${suggested.length})` });
  suggested.forEach((c, i) => {
    rows.push({ c });
    if (i === Math.min(9, suggested.length - 1)) rows.push({ marker: true, dashed: true, key: "top10", label: suggested.length >= 10 ? 'Top 10 above this line: "Invite top 10" invites them' : `Top 10 line: only ${suggested.length} suggestion(s), so "Invite top 10" invites all of them` });
  });
  if (declined.length) rows.push({ marker: true, key: "h-declined", label: `Declined your invitation (${declined.length})` });
  declined.forEach((c) => rows.push({ c }));
  return rows;
}

const blankQuestion = () => ({ prompt: "", options: ["", "", "", ""], answer: 0 });

// One thin horizontal bar: value label in text ink, bar in the brand blue,
// 4px rounded data end anchored at the baseline (dataviz mark spec).
function Bar({ label, value, max, detail, title }) {
  const pct = max > 0 ? Math.max(value > 0 ? 2 : 0, (value / max) * 100) : 0;
  return (
    <div title={title} style={{ display: "grid", gap: 5, padding: "4px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12 }}>
        <span style={{ color: COLORS.textDark, fontWeight: 600 }}>{label}</span>
        <span style={{ color: COLORS.textMid }}>{detail}</span>
      </div>
      <div style={{ background: COLORS.parchmentDark, borderRadius: 4, height: 10 }} aria-hidden="true">
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: "0 4px 4px 0", background: COLORS.info }} />
      </div>
    </div>
  );
}

// Fig. 18, 1818: cumulative stages, each with the share kept from the stage before.
function HiringFunnel({ funnel }) {
  const stages = [
    ["matched", "Matched candidates", "Candidates the engine ranked for the role (Fig. 8, 870)"],
    ["engaged", "Applied or invited", "Applied themselves, or you invited them"],
    ["shortlisted", "Shortlisted", "Reached shortlist or further"],
    ["interviewing", "Interview stage", "Reached interviews or further"],
    ["hired", "Hired", "Hired"],
  ];
  const top = funnel.matched || 0;
  return (
    <section style={cardStyle} aria-labelledby="funnel-h">
      <h4 id="funnel-h" style={headingStyle}>Hiring funnel</h4>
      {top === 0 ? <div style={{ fontSize: 12, color: COLORS.textLight }}>No candidates yet.</div> : (
        <ol style={{ margin: 0, padding: 0, display: "grid", gap: 6 }}>
          {stages.map(([key, label, title], i) => {
            const value = funnel[key] || 0;
            const prev = i === 0 ? null : funnel[stages[i - 1][0]] || 0;
            const kept = prev ? `${Math.round((value / prev) * 100)}% of previous` : prev === 0 ? "-" : "";
            return <li key={key} style={{ listStyle: "none" }}><Bar label={label} value={value} max={top} title={title} detail={`${value}${i ? ` · ${kept}` : ""}`} /></li>;
          })}
        </ol>
      )}
      {funnel.notSelected > 0 && (
        <p style={{ fontSize: 12, color: COLORS.textMid, margin: "10px 0 0" }}>{funnel.notSelected} marked not selected (counted up to "Applied or invited").</p>
      )}
    </section>
  );
}

// Fig. 18, 1820: required skills ranked by how many candidates lack them verified.
function SkillGap({ gap, unassessed, onCreate }) {
  const rows = [...gap]
    .map((g) => ({ ...g, lacking: g.missing + g.claimed + g.below }))
    .sort((a, b) => b.lacking / (b.candidates || 1) - a.lacking / (a.candidates || 1) || a.skill.localeCompare(b.skill));
  return (
    <section style={cardStyle} aria-labelledby="gap-h">
      <h4 id="gap-h" style={headingStyle}>Skill gap</h4>
      <p style={{ fontSize: 12, color: COLORS.textLight, margin: "0 0 10px" }}>Required skills your matched candidates do not have verified at your level, most lacking first.</p>
      {rows.length === 0 || rows.every((g) => g.candidates === 0) ? <div style={{ fontSize: 12, color: COLORS.textLight }}>No candidates yet.</div> : (
        <ol style={{ margin: 0, padding: 0, display: "grid", gap: 8 }}>
          {rows.map((g) => (
            <li key={g.skill} style={{ listStyle: "none" }}>
              <Bar label={g.skill} value={g.lacking} max={g.candidates}
                title={`${g.missing} missing, ${g.claimed} claimed but not verified, ${g.below} below the required level`}
                detail={`${g.lacking} of ${g.candidates} lack it (${g.candidates ? Math.round((g.lacking / g.candidates) * 100) : 0}%)`} />
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", fontSize: 12, color: COLORS.textLight }}>
                <span>{g.missing} missing · {g.claimed} claimed only · {g.below} below level</span>
                {unassessed.has(g.skill.toLowerCase()) && g.lacking > 0 && (
                  <button type="button" onClick={() => onCreate(g.skill)} style={{ ...ghostBtn, padding: "2px 10px", minHeight: 28 }}>Create an assessment for {g.skill}</button>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// Fig. 4, step 425: score one submitted practical task against the rubric.
function TaskReview({ task }) {
  const form = useForm({ scores: task.rubric.map(() => ""), feedback: "" });
  const max = task.rubric.reduce((t, r) => t + r.points, 0);
  const filled = form.data.scores.every((v) => v !== "");
  const rubricPct = max ? form.data.scores.reduce((t, v) => t + Number(v || 0), 0) / max * 100 : 0;
  const final = Math.round(task.mcqScore === null ? rubricPct : (task.mcqScore + rubricPct) / 2);
  const submit = (e) => {
    e.preventDefault();
    form.transform((d) => ({ ...d, scores: d.scores.map(Number) })).post(`/assessment-attempts/${task.id}/review`, { preserveScroll: true });
  };
  return (
    <form onSubmit={submit} style={{ ...cardStyle, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.brownDeep }}>{task.applicant} · {task.assessment}</div>
          <div style={{ fontSize: 12, color: COLORS.textMid, marginTop: 2 }}>
            Verifies {task.skill} · submitted {task.submittedAt}{task.mcqScore !== null ? ` · quiz part ${task.mcqScore}%` : ""} · pass {task.passingScore}%
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: COLORS.textMid }}><strong>Task:</strong> {task.taskPrompt}</div>
      <div style={{ background: COLORS.parchment, border: `1px solid ${COLORS.parchmentDeep}`, borderRadius: 10, padding: "10px 12px", fontSize: 13, color: COLORS.textDark, whiteSpace: "pre-wrap" }}>
        {task.answer || <span style={{ color: COLORS.textLight }}>No written answer; see the file.</span>}
      </div>
      {task.fileUrl && <a href={task.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600, color: COLORS.info }}>Open work file: {task.fileName}</a>}
      <fieldset style={{ border: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
        <legend style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid, marginBottom: 4 }}>Rubric</legend>
        {task.rubric.map((r, i) => (
          <label key={i} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: COLORS.textDark }}>
            <span style={{ flex: 1 }}>{r.criterion}</span>
            <input type="number" min="0" max={r.points} required style={{ ...inputStyle, width: 72 }} value={form.data.scores[i]}
              onChange={(e) => form.setData("scores", form.data.scores.map((v, k) => (k === i ? e.target.value : v)))} />
            <span style={{ width: 48, color: COLORS.textLight }}>/ {r.points}</span>
          </label>
        ))}
        {Object.entries(form.errors).filter(([k]) => k.startsWith("scores")).map(([k, v]) => <span key={k} role="alert" style={{ fontSize: 12, color: "#B91C1C" }}>{v}</span>)}
      </fieldset>
      <Field label="Feedback to the candidate (optional)">
        <textarea rows={2} style={{ ...inputStyle, resize: "vertical" }} value={form.data.feedback} onChange={(e) => form.setData("feedback", e.target.value)} />
      </Field>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span aria-live="polite" style={{ fontSize: 13, fontWeight: 600, color: !filled ? COLORS.textLight : final >= task.passingScore ? "#15803D" : "#B91C1C" }}>
          {filled ? `Final ${final}%: ${final >= task.passingScore ? "passes, the badge will be issued" : "does not pass"}` : "Score every criterion"}
        </span>
        <button type="submit" disabled={!filled || form.processing} style={{ ...primaryBtn, opacity: !filled || form.processing ? 0.6 : 1 }}>Submit score</button>
      </div>
    </form>
  );
}

// Next pipeline step an employer can take for a candidate, if any.
const NEXT_STAGE = {
  applied: ["shortlisted", "Shortlist"],
  invited: ["shortlisted", "Shortlist"],
  shortlisted: ["interviewing", "Move to interview"],
};

export default function EmployerView({ account, activeTab = "job-offers", onTabChange }) {
  const tab = sectionMeta[activeTab] ? activeTab : "job-offers";
  const company = account?.company || {};
  const stats = account?.stats || {};
  const jobPosts = account?.jobPosts || [];
  const assessments = account?.assessments || [];
  const matches = account?.matches || [];
  const topCandidates = account?.topCandidates || [];
  const applicants = account?.applicants || [];
  const taskReviews = account?.taskReviews || [];
  // Fig. 18: hiring funnel (1818) and skill gap (1820), for one role or all.
  const analytics = account?.analytics || { all: { funnel: {}, skillGap: [] }, roles: [] };
  const [analyticsRole, setAnalyticsRole] = useState("all");
  const view = analyticsRole === "all" ? analytics.all : analytics.roles.find((x) => String(x.jobId) === analyticsRole) || analytics.all;
  const unassessed = new Set(jobPosts.flatMap((j) => j.unassessedSkills || []).map((x) => x.toLowerCase()));

  const [statusFilter, setStatusFilter] = useState("all");
  const [review, setReview] = useState(null);   // { jobId, candidate }
  const [checked, setChecked] = useState([]);

  const openReview = (jobId, candidate) => { setReview({ jobId, candidate }); setChecked([]); setVerifyPick({ skill: "", credentialId: "" }); };
  const hire = (jobId, applicantId, mode, checkedIds = []) =>
    router.post(`/job-posts/${jobId}/hire/${applicantId}`, { mode, checked: checkedIds },
      { preserveScroll: true, onSuccess: () => setReview(null) });

  const invite = (jobId, applicantId) => {
    if (!jobId || !applicantId) return;
    router.post(`/job-posts/${jobId}/invite/${applicantId}`, {}, { preserveScroll: true });
  };
  const moveTo = (jobId, applicantId, status) =>
    router.post(`/job-posts/${jobId}/stage/${applicantId}`, { status }, { preserveScroll: true });
  const shortlistPassing = (job, count) => {
    if (window.confirm(`Shortlist ${count} applicant(s) for ${job.title} whose checks all passed? Amber and red candidates stay for your review.`)) {
      router.post(`/job-posts/${job.id}/shortlist-green`, {}, { preserveScroll: true });
    }
  };
  const [verifyPick, setVerifyPick] = useState({ skill: "", credentialId: "" });
  const verifySkill = () =>
    router.post(`/job-posts/${review.jobId}/verify-skill/${review.candidate.id}`,
      { skill: verifyPick.skill, credentialId: Number(verifyPick.credentialId) },
      { preserveScroll: true, onSuccess: () => setReview(null) });

  const [jobOpen, setJobOpen] = useState(false);
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [closingJob, setClosingJob] = useState(null);
  const [kitFor, setKitFor] = useState(null); // { job, candidate? }
  const openKit = (jobId, candidate = null) => {
    const job = jobPosts.find((j) => j.id === jobId);
    if (job) setKitFor({ job, candidate });
  };
  const closeJob = (job, outcome) =>
    router.post(`/job-posts/${job.id}/close`, { outcome }, { preserveScroll: true, onSuccess: () => setClosingJob(null) });
  const verification = company.verification || {};
  const verifyForm = useForm({ registrationType: "DTI", registrationNumber: "", permit: null });
  const submitVerification = (event) => {
    event.preventDefault();
    verifyForm.post("/employer-verification", { forceFormData: true, preserveScroll: true, onSuccess: () => verifyForm.reset() });
  };

  const skillDemand = useMemo(() => {
    const counts = {};
    jobPosts.forEach((job) => (job.requiredSkills || []).forEach((s) => { counts[s] = (counts[s] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [jobPosts]);

  const jobForm = useForm({
    title: "", locationCity: company.locationCity || "", locationRegion: company.locationRegion || "",
    employmentType: "Full-time", workSetup: "On-site", salaryRange: "", description: "",
    responsibilities: "", requiredSkills: "", preferredSkills: "", experienceLevel: "Entry",
    educationRequirement: "", closingDate: "", companyAssessmentId: "",
  });
  // Fig. 6, step 610: a weight (1-5, default 3) and a minimum level for each listed skill.
  const [skillPrefs, setSkillPrefs] = useState({});
  const splitSkills = (text) => text.split(",").map((t) => t.trim()).filter(Boolean);
  const listedSkills = [
    ...splitSkills(jobForm.data.requiredSkills).map((name) => ({ name, type: "required" })),
    ...splitSkills(jobForm.data.preferredSkills).map((name) => ({ name, type: "preferred" })),
  ];
  const prefFor = (name) => skillPrefs[name.toLowerCase()] || { weight: 3, minLevel: "" };
  const setPref = (name, patch) => setSkillPrefs((p) => ({ ...p, [name.toLowerCase()]: { ...prefFor(name), ...patch } }));
  const submitJob = (e) => {
    e.preventDefault();
    jobForm.transform((d) => ({
      ...d,
      companyAssessmentId: d.companyAssessmentId || null,
      skillSettings: listedSkills.map((sk) => ({ name: sk.name, weight: Number(prefFor(sk.name).weight), minLevel: prefFor(sk.name).minLevel ? Number(prefFor(sk.name).minLevel) : null })),
    }));
    jobForm.post("/job-posts", { preserveScroll: true, onSuccess: () => { jobForm.reset(); setSkillPrefs({}); setJobOpen(false); } });
  };
  const inviteTop = (job) => {
    if (window.confirm(`Invite the top 10 candidates for ${job.title} by match score? People who already applied or were invited are skipped.`)) {
      router.post(`/job-posts/${job.id}/invite-top`, {}, { preserveScroll: true });
    }
  };

  const assessmentForm = useForm({
    title: "", role: "", skill: "", durationMinutes: 15, passingScore: 70, instructions: "",
    questions: [blankQuestion(), blankQuestion(), blankQuestion()],
    // Fig. 16: optional practical task and its rubric (1610-1620).
    taskOn: false, taskPrompt: "", taskFileRequired: true,
    rubric: [{ criterion: "", points: 5 }, { criterion: "", points: 5 }, { criterion: "", points: 5 }],
  });
  const setCriterion = (i, patch) =>
    assessmentForm.setData("rubric", assessmentForm.data.rubric.map((r, ri) => (ri === i ? { ...r, ...patch } : r)));
  const openAssessment = (skill = "", role = "") => {
    assessmentForm.setData((d) => ({ ...d, skill: skill || d.skill, role: role || d.role, title: skill ? `${skill} Assessment` : d.title }));
    setAssessmentOpen(true);
  };
  const setQuestion = (i, patch) =>
    assessmentForm.setData("questions", assessmentForm.data.questions.map((q, qi) => (qi === i ? { ...q, ...patch } : q)));
  const submitAssessment = (e) => {
    e.preventDefault();
    assessmentForm.transform(({ taskOn, ...d }) => ({
      ...d,
      questions: d.questions.map((q) => ({ ...q, options: q.options.map((o) => o.trim()).filter(Boolean) })),
      taskPrompt: taskOn ? d.taskPrompt : "",
      taskFileRequired: taskOn && d.taskFileRequired,
      rubric: taskOn ? d.rubric.map((r) => ({ criterion: r.criterion.trim(), points: Number(r.points) })) : null,
    })).post("/assessments", { preserveScroll: true, onSuccess: () => { assessmentForm.reset(); setAssessmentOpen(false); } });
  };

  const profileForm = useForm({
    companyName: company.companyName || "", industry: company.industry || "", companySize: company.companySize || "",
    locationCity: company.locationCity || "", locationRegion: company.locationRegion || "",
    recruiterName: company.recruiterName || "", recruiterPosition: company.recruiterPosition || "",
    recruiterContact: company.recruiterContact || "",
  });
  const submitProfile = (e) => {
    e.preventDefault();
    profileForm.put("/employer-profile", { preserveScroll: true, onSuccess: () => setProfileOpen(false) });
  };

  return (
    <div style={{ padding: "28px 32px", fontFamily: FONT_BODY, background: COLORS.parchment, minHeight: "calc(100vh - 64px)" }}>
      {/* Header banner — same pattern as the applicant dashboard */}
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
          fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 700, color: "#fff", flexShrink: 0,
          border: "3px solid rgba(255,255,255,0.25)",
        }}>{companyInitials(company.companyName)}</div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 600, color: "#fff", marginBottom: 4 }}>{company.companyName || "Your Company"}</h2>
          <p style={{ color: "rgba(224,242,254,0.85)", fontSize: 13, marginBottom: 12 }}>{company.industry || "Employer workspace"}</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {company.emailVerified && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(34,197,94,0.18)", color: COLORS.goldLight, padding: "4px 11px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                <IconCheck size={12} /> Verified
              </span>
            )}
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.12)", color: "#fff", padding: "4px 11px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
              <IconBriefcase size={12} /> {jobPosts.length} active role(s)
            </span>
            {company.locationCity && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "rgba(224,242,254,0.8)", fontSize: 12 }}>
                <IconMapPin size={13} /> {company.locationCity}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {[[jobPosts.length, "Roles"], [stats.activeApplicants ?? 0, "Applicants"], [stats.hired ?? 0, "Hired"]].map(([v, l]) => (
            <div key={l} style={{ textAlign: "center", background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 16px", minWidth: 76 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: COLORS.goldLight, fontWeight: 700 }}>{v}</div>
              <div style={{ fontSize: 12, color: "rgba(224,242,254,0.7)" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Section heading */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 600, color: COLORS.brownDeep }}>{sectionMeta[tab].label}</h1>
          <p style={{ fontSize: 12, color: COLORS.textLight }}>{sectionMeta[tab].sub}</p>
        </div>
        {tab === "job-offers" && (company.emailVerified
          ? <button type="button" onClick={() => setJobOpen(true)} style={primaryBtn}><IconPlus size={14} /> Post new job</button>
          : <button type="button" onClick={() => onTabChange?.("company")} style={ghostBtn}>Verify company to post jobs</button>)}
        {tab === "assessments" && (
          <button type="button" onClick={() => openAssessment()} disabled={!company.emailVerified}
            title={company.emailVerified ? "" : "Only verified companies can issue badges"}
            style={{ ...primaryBtn, opacity: company.emailVerified ? 1 : 0.5, cursor: company.emailVerified ? "pointer" : "not-allowed" }}>
            <IconPlus size={14} /> Post assessment
          </button>
        )}
        {tab === "matches" && <button type="button" onClick={() => setInviteOpen(true)} style={primaryBtn}>Top candidates</button>}
        {tab === "company" && <button type="button" onClick={() => setProfileOpen(true)} style={primaryBtn}>Edit profile</button>}
      </div>

      {tab === "job-offers" && (
        <div style={{ display: "grid", gap: 12 }}>
          {jobPosts.length === 0 ? (
            <div style={{ ...cardStyle, borderStyle: "dashed", fontSize: 13, color: COLORS.textMid }}>No job offers yet. Post your first role to start receiving matches.</div>
          ) : jobPosts.map((job) => (
            <div key={job.id} style={{ ...cardStyle, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.brownDeep }}>{job.title}</div>
                  <div style={{ fontSize: 12, color: COLORS.textMid, marginTop: 3 }}>{job.locationCity}{job.locationRegion ? `, ${job.locationRegion}` : ""} · {job.workSetup} · {job.employmentType}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {job.status === "Closed"
                    ? <span className="sbph-badge" style={{ background: "#F1F5F9", color: "#475569" }}>Closed · {job.closedReason || "ended"}</span>
                    : job.expired
                      ? <span className="sbph-badge" style={{ background: "rgba(180,83,9,0.12)", color: "#92400E" }}>Expired {job.closingDate}</span>
                      : <span className="sbph-badge badge-open">Open{job.closingDate ? ` · closes ${job.closingDate}` : ""}</span>}
                  <span style={{ padding: "4px 10px", borderRadius: 999, background: COLORS.parchment, fontSize: 12, color: COLORS.textMid, border: `1px solid ${COLORS.parchmentDeep}` }}>{job.applicants} applicants</span>
                  {job.salaryRange && <span style={{ padding: "4px 10px", borderRadius: 999, background: COLORS.parchment, fontSize: 12, color: COLORS.textMid, border: `1px solid ${COLORS.parchmentDeep}` }}>{job.salaryRange}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(job.skillSettings || []).filter((sk) => sk.type === "required").slice(0, 6).map((sk) => (
                  <span key={sk.name} style={{ padding: "4px 10px", borderRadius: 999, background: COLORS.parchment, fontSize: 12, color: COLORS.textMid, border: `1px solid ${COLORS.parchmentDeep}` }}>
                    {sk.name} · weight {sk.weight}{sk.minLevel ? ` · min ${sk.minLevel}%` : ""}
                  </span>
                ))}
                {job.assessment && (
                  <span style={{ padding: "4px 10px", borderRadius: 999, background: "rgba(3,105,161,0.10)", fontSize: 12, fontWeight: 600, color: "#075985" }}>
                    Assessment: {job.assessment.title}
                  </span>
                )}
                {(job.requiredSkills || []).length === 0 && <span style={{ fontSize: 12, color: COLORS.textLight }}>No required skills listed</span>}
              </div>
              {job.status !== "Closed" && (
                closingJob === job.id ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: COLORS.textMid }}>How did this role end?</span>
                    <button type="button" style={{ ...primaryBtn, background: COLORS.success }} onClick={() => closeJob(job, "filled")}>Filled</button>
                    <button type="button" style={ghostBtn} onClick={() => closeJob(job, "cancelled")}>Cancelled</button>
                    <button type="button" style={{ ...ghostBtn, border: "none" }} onClick={() => setClosingJob(null)}>Keep open</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" style={ghostBtn} onClick={() => openKit(job.id)}>Interview kit ({(job.interviewKit || []).length} questions)</button>
                    <button type="button" style={ghostBtn} onClick={() => setClosingJob(job.id)}>
                      {job.expired ? "Past closing date: close role" : "Close role"}
                    </button>
                  </div>
                )
              )}
              {(job.unassessedSkills || []).length > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", background: "rgba(180,83,9,0.08)", border: "1px solid rgba(180,83,9,0.25)", borderRadius: 10, padding: "10px 12px" }}>
                  <span style={{ fontSize: 12, color: "#92400E" }}>
                    <strong>No assessment tests:</strong> {job.unassessedSkills.join(", ")}. Candidates can only verify these through your evidence review.
                  </span>
                  {company.emailVerified && (
                    <button type="button" style={{ ...ghostBtn, padding: "6px 10px" }} onClick={() => openAssessment(job.unassessedSkills[0], job.title)}>
                      Create {job.unassessedSkills[0]} assessment
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "assessments" && (
        <div style={{ display: "grid", gap: 12 }}>
          {taskReviews.length > 0 && (
            <section aria-label="Tasks to score" style={{ display: "grid", gap: 10 }}>
              <h3 style={{ margin: 0, fontSize: 15, color: COLORS.brownDeep, fontFamily: FONT_DISPLAY }}>Tasks to score ({taskReviews.length})</h3>
              {taskReviews.map((t) => <TaskReview key={t.id} task={t} />)}
            </section>
          )}
          {assessments.length === 0 ? (
            <div style={{ ...cardStyle, borderStyle: "dashed", fontSize: 13, color: COLORS.textMid }}>
              {company.emailVerified
                ? "No assessments yet. Each one you publish verifies a single skill: candidates who pass get a badge issued in your company's name."
                : "Your company is not verified yet. Once SkillBridge PH verifies it, your assessments can issue skill badges."}
            </div>
          ) : assessments.map((a) => (
            <div key={a.id} style={{ ...cardStyle, display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.brownDeep }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: COLORS.textMid, marginTop: 3 }}>
                    Verifies <strong>{a.skill || "no skill set"}</strong> · {a.role} · {a.questionCount} questions{a.taskPrompt ? ` + practical task (${a.rubric.length}-criterion rubric)` : ""} · {a.durationMinutes} min · Pass {a.passingScore}% · {a.passed} badge(s) issued
                  </div>
                </div>
                {a.status === "Suspended"
                  ? <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: "rgba(185,28,28,0.12)", color: "#B91C1C" }}>Suspended</span>
                  : <span className="sbph-badge badge-open">{a.status}</span>}
              </div>
              {a.status === "Suspended" && (
                <div role="alert" style={{ fontSize: 12, color: "#B91C1C" }}>
                  Suspended by SkillBridge PH: {a.moderationNote}. It does not issue badges until an administrator reinstates it.
                </div>
              )}
              {a.instructions && <div style={{ fontSize: 12, color: COLORS.textLight }}>{a.instructions}</div>}
            </div>
          ))}
        </div>
      )}

      {tab === "applicants" && (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              ["all", "All"],
              ["applied", "Applied"],
              ["invited", "Invited"],
              ["shortlisted", "Shortlisted"],
              ["interviewing", "Interviewing"],
              ["hired", "Hired"],
              ["not_selected", "Not selected"],
              ["declined", "Declined"],
            ].map(([key, label]) => {
              const count = key === "all" ? applicants.length : applicants.filter((a) => a.status === key).length;
              const on = statusFilter === key;
              return (
                <button key={key} type="button" onClick={() => setStatusFilter(key)}
                  style={{
                    padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    border: "1px solid " + (on ? COLORS.info : COLORS.parchmentDeep),
                    background: on ? COLORS.info : "transparent",
                    color: on ? "#fff" : COLORS.textMid,
                  }}>
                  {label} ({count})
                </button>
              );
            })}
          </div>

          {applicants.filter((a) => statusFilter === "all" || a.status === statusFilter).length === 0 ? (
            <div style={{ ...cardStyle, borderStyle: "dashed", fontSize: 13, color: COLORS.textMid }}>
              No applicants here yet. Post a job, or invite a candidate from Matches.
            </div>
          ) : (
            applicants
              .filter((a) => statusFilter === "all" || a.status === statusFilter)
              .map((a) => {
                const meta = STATUS_META[a.status] || STATUS_META.applied;
                return (
                  <div key={a.id + "-" + a.jobId} style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flex: 1, minWidth: 260 }}>
                      <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, " + COLORS.info + ", " + COLORS.success + ")", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>{a.avatar}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.brownDeep }}>{a.name}</div>
                        <div style={{ fontSize: 12, color: COLORS.textMid, marginTop: 2 }}>{a.role} - {a.location}</div>
                        <div style={{ fontSize: 12, color: COLORS.textMid, marginTop: 4 }}>
                          {["invited", "declined"].includes(a.status) ? "Invited to" : "Applied for"} <strong>{a.jobTitle}</strong> · {a.appliedAt}
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
                          <span style={{ padding: "2px 9px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: meta.bg, color: meta.color }}>{meta.label}</span>
                          <span style={{ fontSize: 12, color: COLORS.textLight }}>{a.credentials.length} credential(s)</span>
                          <InterviewChip interview={a.interview} />
                        </div>
                        {a.assessment && (
                          <div style={{ fontSize: 12, color: COLORS.textMid, marginTop: 6 }}>
                            Job assessment ({a.assessment.title}):{" "}
                            <strong style={{ color: ASSESSMENT_STATE[a.assessment.state].color }}>{ASSESSMENT_STATE[a.assessment.state].label}</strong>
                          </div>
                        )}
                        <ReviewVerdict review={a.review} />
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, color: a.score >= 85 ? COLORS.success : COLORS.info }}>{a.score}%</div>
                        <div style={{ fontSize: 12, color: COLORS.textLight }}>match</div>
                      </div>
                      {a.status === "declined" ? (
                        <span style={{ fontSize: 12, color: COLORS.textMid, maxWidth: 180 }}>Declined your invitation. Documents are hidden and this role cannot invite them again.</span>
                      ) : (
                      <div style={{ display: "grid", gap: 6 }}>
                        {a.hired ? (
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#15803D", textAlign: "center" }}>
                            Hired via {a.reviewedMode === "auto" ? "system review" : "manual review"}
                          </span>
                        ) : a.status === "not_selected" ? null : (
                          <button
                            style={{ ...primaryBtn, padding: "6px 12px",
                              background: a.review?.canAutoApprove ? COLORS.success : COLORS.parchmentDeep,
                              color: a.review?.canAutoApprove ? "#fff" : COLORS.textLight,
                              cursor: a.review?.canAutoApprove ? "pointer" : "not-allowed" }}
                            disabled={!a.review?.canAutoApprove}
                            title={a.review?.canAutoApprove ? "Accept the system checks and hire" : "Checks flagged something - open the credentials and read them first"}
                            onClick={() => hire(a.jobId, a.id, "auto")}
                          >
                            Approve and hire
                          </button>
                        )}
                        {!a.hired && NEXT_STAGE[a.status] && (
                          <button style={{ ...ghostBtn, padding: "6px 12px" }} onClick={() => moveTo(a.jobId, a.id, NEXT_STAGE[a.status][0])}>
                            {NEXT_STAGE[a.status][1]}
                          </button>
                        )}
                        {/* Fig. 7, steps 740-760: closing the loop; the applicant is told in the app and by email. */}
                        {!a.hired && a.status !== "not_selected" && (
                          <button style={{ ...ghostBtn, padding: "6px 12px", color: "#475569" }}
                            onClick={() => { if (window.confirm(`Mark ${a.name} as not selected for ${a.jobTitle}? They will be notified.`)) moveTo(a.jobId, a.id, "not_selected"); }}>
                            Not selected
                          </button>
                        )}
                        {a.status === "not_selected" && (
                          <button style={{ ...ghostBtn, padding: "6px 12px" }} onClick={() => moveTo(a.jobId, a.id, "shortlisted")}>
                            Reconsider (shortlist)
                          </button>
                        )}
                        {/* Always available: the employer can read the documents themselves
                            no matter what the system concluded, before or after hiring. */}
                        <button style={{ ...ghostBtn, padding: "6px 12px" }} onClick={() => openReview(a.jobId, a)}>
                          {a.hired ? "View credentials" : "Review credentials"}
                        </button>
                        <button style={{ ...ghostBtn, padding: "6px 12px" }} onClick={() => openKit(a.jobId, a)}>
                          {a.interview ? "Edit interview" : "Interview"}
                        </button>
                      </div>
                      )}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      )}

      {tab === "matches" && (
        <div style={{ display: "grid", gap: 16 }}>
          {matches.length === 0 && <div style={{ ...cardStyle, borderStyle: "dashed", fontSize: 13, color: COLORS.textMid }}>Post a job to see candidate matches.</div>}
          {matches.map(({ job, candidates }) => (
            <div key={job.id} style={{ ...cardStyle, display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.brownDeep }}>{job.title}</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ padding: "4px 10px", borderRadius: 999, background: COLORS.parchment, fontSize: 12, color: COLORS.textMid, border: `1px solid ${COLORS.parchmentDeep}` }}>{candidates.length} match(es)</span>
                  {["green", "amber", "red"].map((v) => {
                    const n = candidates.filter((c) => c.review?.status === v).length;
                    return n > 0 && <span key={v} style={{ padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: VERDICT[v].bg, color: VERDICT[v].color }}>{n} {VERDICT[v].label.toLowerCase()}</span>;
                  })}
                  {candidates.some((c) => !c.status) && (
                    <button type="button" style={primaryBtn} onClick={() => inviteTop(job)}>Invite top 10</button>
                  )}
                  {(() => {
                    const passing = candidates.filter((c) => ["applied", "invited"].includes(c.status) && c.review?.canAutoApprove).length;
                    return passing > 0 && (
                      <button type="button" style={{ ...primaryBtn, background: COLORS.success }} onClick={() => shortlistPassing(job, passing)}>
                        <IconCheck size={13} /> Shortlist {passing} passing
                      </button>
                    );
                  })()}
                </div>
              </div>
              {candidates.length === 0 ? (
                <div style={{ fontSize: 12, color: COLORS.textMid }}>No applicants yet and nobody above 70% match. New applicants and verified skills appear here automatically.</div>
              ) : rankedRows(candidates).map((row) => row.marker ? (
                <div key={row.key} role="separator" aria-label={row.label}
                  style={row.dashed
                    ? { borderTop: `2px dashed ${COLORS.info}`, paddingTop: 6, fontSize: 12, fontWeight: 700, color: COLORS.info }
                    : { fontSize: 12, fontWeight: 700, color: COLORS.textMid, marginTop: 4 }}>
                  {row.label}
                </div>
              ) : ((c) => (
                <div key={c.id} style={{ background: COLORS.parchment, borderRadius: 10, padding: "12px 14px", border: `1px solid ${COLORS.parchmentDeep}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.info}, ${COLORS.success})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{c.avatar}</div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.brownDeep }}>{c.name}</div>
                        {c.status && STATUS_META[c.status] && (
                          <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: STATUS_META[c.status].bg, color: STATUS_META[c.status].color }}>{STATUS_META[c.status].label}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: COLORS.textMid, marginTop: 2 }}>{c.role} · {c.location}</div>
                      <div style={{ fontSize: 12, color: COLORS.textLight, marginTop: 4 }}>Matched skills: {c.matchedSkills}</div>
                      <VerificationSignals signals={c.signals} />
                      <ReviewVerdict review={c.review} />
                      {c.interview && <div style={{ marginTop: 6 }}><InterviewChip interview={c.interview} /></div>}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, color: c.score >= 85 ? COLORS.success : COLORS.info }}>{c.score}%</div>
                      <div style={{ fontSize: 12, color: COLORS.textLight }}>match</div>
                    </div>
                    {c.status === "declined"
                      ? <span style={{ fontSize: 12, color: COLORS.textMid }}>Declined your invitation</span>
                      : c.status
                      ? <>
                          <button style={ghostBtn} onClick={() => openReview(job.id, c)}>Review</button>
                          <button style={ghostBtn} onClick={() => openKit(job.id, c)}>{c.interview ? "Edit interview" : "Interview"}</button>
                        </>
                      : <button style={primaryBtn} onClick={() => invite(job.id, c.id)}>Invite</button>}
                  </div>
                </div>
              ))(row.c))}
            </div>
          ))}
        </div>
      )}

      {tab === "analytics" && (
        <div style={{ display: "grid", gap: 22 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <Field label="Role">
            <select value={analyticsRole} onChange={(e) => setAnalyticsRole(e.target.value)} style={{ ...inputStyle, minWidth: 240 }}>
              <option value="all">All roles</option>
              {analytics.roles.map((x) => <option key={x.jobId} value={String(x.jobId)}>{x.title}</option>)}
            </select>
          </Field>
          {analyticsRole === "all" && analytics.roles.length > 1 && (
            <span style={{ fontSize: 12, color: COLORS.textLight, paddingBottom: 12 }}>All roles added together: a candidate ranked for two roles counts once per role.</span>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 22 }}>
          <HiringFunnel funnel={view.funnel} />
          <SkillGap gap={view.skillGap} unassessed={unassessed} onCreate={(skill) => openAssessment(skill)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 22 }}>
          <div style={cardStyle}>
            <h4 style={headingStyle}>Roles &amp; applicants</h4>
            {jobPosts.length === 0 && <div style={{ fontSize: 12, color: COLORS.textLight }}>No data yet.</div>}
            {jobPosts.map((job) => (
              <div key={job.id} style={{ marginBottom: 14 }}>
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
          <div style={cardStyle}>
            <h4 style={headingStyle}>Top skill demand</h4>
            {skillDemand.length === 0 && <div style={{ fontSize: 12, color: COLORS.textLight }}>No data yet.</div>}
            {skillDemand.map(([skill, count]) => (
              <div key={skill} style={{ marginBottom: 14 }}>
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
        </div>
      )}

      {tab === "company" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 22 }}>
          <div style={{ ...cardStyle, display: "grid", gap: 10 }}>
            <h4 style={headingStyle}>Company details</h4>
            {[["Company", company.companyName || "—"], ["Industry", company.industry || "—"], ["Size", company.companySize ? `${company.companySize} employees` : "—"], ["Location", [company.locationCity, company.locationRegion].filter(Boolean).join(", ") || "—"], ["Recruiter", company.recruiterName || "—"], ["Position", company.recruiterPosition || "—"], ["Contact", company.recruiterContact || "—"]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
                <span style={{ color: COLORS.textLight }}>{k}</span>
                <span style={{ color: COLORS.textDark, fontWeight: 600, textAlign: "right" }}>{v}</span>
              </div>
            ))}
            <button type="button" onClick={() => setProfileOpen(true)} style={{ ...ghostBtn, marginTop: 6, justifySelf: "start" }}>Edit profile</button>
          </div>
          <div style={{ ...cardStyle, display: "grid", gap: 10, alignContent: "start" }}>
            <h4 style={headingStyle}>Verification</h4>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: company.emailVerified ? COLORS.success : COLORS.textMid }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, background: company.emailVerified ? "rgba(22,163,74,0.12)" : COLORS.parchmentDark, color: company.emailVerified ? COLORS.success : COLORS.textLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {company.emailVerified ? <IconCheck size={18} /> : <IconBuilding size={18} />}
              </span>
              {{
                approved: `Verified by SkillBridge PH${verification.reviewedAt ? ` · ${verification.reviewedAt}` : ""}`,
                pending: "Waiting for a SkillBridge PH admin",
                rejected: "Not verified",
              }[verification.status] || "Not submitted yet"}
            </div>
            {verification.status === "pending" && (
              <PreCheckList checks={verification.precheck} title="Automatic pre-check, done. An admin decides next." />
            )}
            {verification.registrationNumber && (
              <div style={{ fontSize: 12, color: COLORS.textMid }}>{verification.registrationType} registration {verification.registrationNumber}</div>
            )}
            {verification.status === "rejected" && verification.note && (
              <div role="alert" style={{ fontSize: 12, color: "#B91C1C" }}>Reason: {verification.note}</div>
            )}
            <p style={{ fontSize: 12, color: COLORS.textLight, margin: 0 }}>
              {company.emailVerified
                ? "You can post jobs, your assessments issue skill badges, and your evidence reviews can verify a candidate's skill. All carry your company name."
                : "A SkillBridge PH admin checks your DTI or SEC registration against the official registry. Until then you cannot post jobs or issue badges."}
            </p>
            {["unsubmitted", "rejected"].includes(verification.status) && (
              <form onSubmit={submitVerification} style={{ display: "grid", gap: 10 }}>
                <Field label="Registered with">
                  <select value={verifyForm.data.registrationType} onChange={(e) => verifyForm.setData("registrationType", e.target.value)} style={inputStyle}>
                    <option value="DTI">DTI (sole proprietorship)</option>
                    <option value="SEC">SEC (corporation / partnership)</option>
                  </select>
                </Field>
                <Field label="Registration number" error={verifyForm.errors.registrationNumber}>
                  <input value={verifyForm.data.registrationNumber} onChange={(e) => verifyForm.setData("registrationNumber", e.target.value)} placeholder="e.g. 3456789" style={inputStyle} />
                </Field>
                <Field label="Business permit or registration certificate (PDF/image, max 10MB)" error={verifyForm.errors.permit}>
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => verifyForm.setData("permit", e.target.files[0])} style={{ ...inputStyle, padding: "8px 10px" }} />
                </Field>
                <button type="submit" disabled={verifyForm.processing || !verifyForm.data.permit || !verifyForm.data.registrationNumber}
                  style={{ ...primaryBtn, justifySelf: "start", opacity: verifyForm.processing || !verifyForm.data.permit || !verifyForm.data.registrationNumber ? 0.6 : 1 }}>
                  {verifyForm.processing ? "Submitting…" : "Submit for verification"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {kitFor && (
        <InterviewKitModal key={`${kitFor.job.id}-${kitFor.candidate?.id ?? "preview"}`} job={kitFor.job} candidate={kitFor.candidate}
          doNotAsk={account?.doNotAsk} onClose={() => setKitFor(null)} />
      )}

      {/* Manual credential review */}
      {review && (
        <Modal eyebrow="Manual review" title={review.candidate.name + " - credentials"} onClose={() => setReview(null)}>
          <ReviewVerdict review={review.candidate.review} />
          <div style={{ fontSize: 12, color: COLORS.textLight }}>
            Open each document and tick it once you have read it. The system checked consistency and
            assessment results, but it cannot certify that a document is authentic, so this read is yours.
          </div>
          {(review.candidate.skills || []).length > 0 && (
            <div style={{ border: "1px solid " + COLORS.parchmentDeep, borderRadius: 10, padding: "12px 14px", background: COLORS.cream }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.brownDeep, marginBottom: 10 }}>Skills and who verified them</div>
              {review.candidate.skills.map((sk) => <SkillBar key={sk.name} skill={sk} />)}
            </div>
          )}
          <div style={{ display: "grid", gap: 10 }}>
            {(review.candidate.credentials || []).length === 0 && (
              <div style={{ fontSize: 13, color: COLORS.textMid }}>This candidate has not uploaded any credentials.</div>
            )}
            {(review.candidate.credentials || []).map((c) => {
              const isVideo = c.type === "video" || (c.mime || "").startsWith("video");
              return (
                <div key={c.id} style={{ border: "1px solid " + COLORS.parchmentDeep, borderRadius: 10, padding: 12, display: "grid", gap: 8, background: COLORS.parchment }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.brownDeep }}>{c.title}</div>
                      <div style={{ fontSize: 12, color: COLORS.textLight }}>{c.type} - {c.originalName}</div>
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: COLORS.textMid }}>
                      <input type="checkbox" checked={checked.includes(c.id)}
                        onChange={(e) => setChecked((prev) => e.target.checked ? [...prev, c.id] : prev.filter((x) => x !== c.id))} />
                      Reviewed
                    </label>
                  </div>
                  <RegistryStatus registry={c.registry} />
                  {isVideo && (c.recording ? (
                    <div style={{ fontSize: 12, color: COLORS.textMid, display: "grid", gap: 2 }}>
                      <strong style={{ color: COLORS.brownDeep }}>Check the video for each live prompt (times are approximate):</strong>
                      {c.recording.prompts.map((pr, i) => <span key={i}>{mmss(pr.at)} - {pr.text}</span>)}
                      <span>If any is missing, or the person changes, treat the video as unproven.</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#B45309" }}>Not recorded in SkillBridge with live prompts: treat as unproven.</div>
                  ))}
                  {(c.extractedSkills || []).length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {c.extractedSkills.map((sk) => (
                        <span key={sk} style={{ padding: "2px 7px", borderRadius: 999, background: COLORS.parchmentDark, fontSize: 12, color: COLORS.brownMid }}>{sk}</span>
                      ))}
                    </div>
                  )}
                  {isVideo
                    ? <video src={c.url} controls style={{ width: "100%", maxHeight: 260, background: "#000", borderRadius: 8 }} />
                    : <a href={c.url} target="_blank" rel="noreferrer" style={{ ...primaryBtn, padding: "6px 12px", textDecoration: "none", justifySelf: "start" }}>Open document</a>}
                </div>
              );
            })}
          </div>
          {(() => {
            const evidence = (review.candidate.credentials || []).filter((c) => ["portfolio", "certificate", "video"].includes(c.type));
            const skillsLeft = review.candidate.verifiable || [];
            if (!company.emailVerified || evidence.length === 0 || skillsLeft.length === 0) return null;
            return (
              <div style={{ border: "1px solid rgba(22,163,74,0.35)", borderRadius: 10, padding: "12px 14px", background: "rgba(22,163,74,0.06)", display: "grid", gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#15803D" }}>Verify a skill from evidence</div>
                <div style={{ fontSize: 12, color: COLORS.textMid }}>
                  Only if the file you opened clearly demonstrates the skill. The badge will name {company.companyName} and this file, and the candidate cannot delete it afterwards.
                  A video counts only after your interview confirmed it is the same person and they repeated the task live.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                  <Field label="Skill">
                    <select style={inputStyle} value={verifyPick.skill} onChange={(e) => setVerifyPick((v) => ({ ...v, skill: e.target.value }))}>
                      <option value="">Choose a skill</option>
                      {skillsLeft.map((sk) => <option key={sk}>{sk}</option>)}
                    </select>
                  </Field>
                  <Field label="Evidence reviewed">
                    <select style={inputStyle} value={verifyPick.credentialId} onChange={(e) => setVerifyPick((v) => ({ ...v, credentialId: e.target.value }))}>
                      <option value="">Choose a file</option>
                      {evidence.map((c) => <option key={c.id} value={c.id}>{c.title} ({c.type})</option>)}
                    </select>
                  </Field>
                </div>
                <div>
                  <button type="button" disabled={!verifyPick.skill || !verifyPick.credentialId || !checked.includes(Number(verifyPick.credentialId))}
                    title="Tick the file as reviewed first"
                    style={{ ...primaryBtn, background: COLORS.success, opacity: verifyPick.skill && verifyPick.credentialId && checked.includes(Number(verifyPick.credentialId)) ? 1 : 0.5 }}
                    onClick={verifySkill}>
                    <IconCheck size={13} /> Verify skill
                  </button>
                </div>
              </div>
            );
          })()}
          {(() => {
            const all = (review.candidate.credentials || []).map((c) => c.id);
            const allRead = all.every((id) => checked.includes(id));
            return (
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "center", flexWrap: "wrap" }}>
                {!allRead && <span style={{ fontSize: 12, color: COLORS.textLight }}>Tick every credential as reviewed to hire on manual review.</span>}
                <button type="button" style={ghostBtn} onClick={() => setReview(null)}>Close</button>
                {review.candidate.status !== undefined && review.candidate.status !== null && (
                  <button type="button" disabled={!allRead} style={{ ...primaryBtn, opacity: allRead ? 1 : 0.5, cursor: allRead ? "pointer" : "not-allowed" }}
                    onClick={() => hire(review.jobId, review.candidate.id, "manual", checked)}>
                    {review.candidate.hired ? "Re-confirm after review" : "Hire after review"}
                  </button>
                )}
              </div>
            );
          })()}
        </Modal>
      )}

      {/* Post job modal */}
      {jobOpen && (
        <Modal eyebrow="Post new job" title="Create a job offer" onClose={() => setJobOpen(false)}>
          <form onSubmit={submitJob} style={{ display: "grid", gap: 12 }}>
            <Field label="Job Title"><input style={inputStyle} value={jobForm.data.title} onChange={(e) => jobForm.setData("title", e.target.value)} />{jobForm.errors.title && <span style={{ fontSize: 12, color: "#DC2626" }}>{jobForm.errors.title}</span>}</Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="City"><input style={inputStyle} value={jobForm.data.locationCity} onChange={(e) => jobForm.setData("locationCity", e.target.value)} /></Field>
              <Field label="Region (optional)"><input style={inputStyle} value={jobForm.data.locationRegion} onChange={(e) => jobForm.setData("locationRegion", e.target.value)} /></Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Job Type"><select style={inputStyle} value={jobForm.data.employmentType} onChange={(e) => jobForm.setData("employmentType", e.target.value)}><option>Full-time</option><option>Part-time</option><option>Contract</option><option>Internship</option></select></Field>
              <Field label="Work Setup"><select style={inputStyle} value={jobForm.data.workSetup} onChange={(e) => jobForm.setData("workSetup", e.target.value)}><option>On-site</option><option>Hybrid</option><option>Remote</option></select></Field>
            </div>
            <Field label="Required Skills (comma-separated)"><input style={inputStyle} placeholder="React, CSS, JavaScript" value={jobForm.data.requiredSkills} onChange={(e) => jobForm.setData("requiredSkills", e.target.value)} />{jobForm.errors.requiredSkills && <span style={{ fontSize: 12, color: "#DC2626" }}>{jobForm.errors.requiredSkills}</span>}</Field>
            <Field label="Preferred Skills (comma-separated)"><input style={inputStyle} placeholder="Figma, Git" value={jobForm.data.preferredSkills} onChange={(e) => jobForm.setData("preferredSkills", e.target.value)} /></Field>
            {listedSkills.length > 0 && (
              <fieldset style={{ border: `1px solid ${COLORS.parchmentDeep}`, borderRadius: 10, padding: "10px 12px", display: "grid", gap: 8, margin: 0 }}>
                <legend style={{ fontSize: 12, fontWeight: 700, color: COLORS.brownDeep, padding: "0 6px" }}>Weight and minimum level per skill</legend>
                <div style={{ fontSize: 12, color: COLORS.textLight }}>
                  Weight decides how much a skill counts in the match score (5 = most). A minimum level is met only by a verified badge at that level or higher.
                </div>
                {listedSkills.map((sk) => (
                  <div key={sk.type + sk.name} style={{ display: "grid", gridTemplateColumns: "minmax(120px, 1fr) 110px 130px", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.brownDeep }}>
                      {sk.name} <span style={{ fontSize: 12, fontWeight: 400, color: COLORS.textLight }}>({sk.type})</span>
                    </span>
                    <select aria-label={`Weight for ${sk.name}`} style={inputStyle} value={prefFor(sk.name).weight} onChange={(e) => setPref(sk.name, { weight: e.target.value })}>
                      {[1, 2, 3, 4, 5].map((w) => <option key={w} value={w}>Weight {w}</option>)}
                    </select>
                    <select aria-label={`Minimum level for ${sk.name}`} style={inputStyle} value={prefFor(sk.name).minLevel} onChange={(e) => setPref(sk.name, { minLevel: e.target.value })}>
                      <option value="">No minimum</option>
                      {[50, 70, 85].map((m) => <option key={m} value={m}>Min {m}%</option>)}
                    </select>
                  </div>
                ))}
              </fieldset>
            )}
            <Field label="Attach an assessment (optional)" hint="Candidates for this job are asked to take it." error={jobForm.errors.companyAssessmentId}>
              <select style={inputStyle} value={jobForm.data.companyAssessmentId} onChange={(e) => jobForm.setData("companyAssessmentId", e.target.value)}>
                <option value="">No assessment</option>
                {assessments.filter((a) => a.status === "Active").map((a) => <option key={a.id} value={a.id}>{a.title} (verifies {a.skill})</option>)}
              </select>
            </Field>
            <Field label="Salary Range (optional)"><input style={inputStyle} placeholder="PHP 20k-30k" value={jobForm.data.salaryRange} onChange={(e) => jobForm.setData("salaryRange", e.target.value)} /></Field>
            <Field label="Responsibilities"><textarea rows={2} style={{ ...inputStyle, resize: "vertical" }} value={jobForm.data.responsibilities} onChange={(e) => jobForm.setData("responsibilities", e.target.value)} />{jobForm.errors.responsibilities && <span style={{ fontSize: 12, color: "#DC2626" }}>{jobForm.errors.responsibilities}</span>}</Field>
            <Field label="Job Description"><textarea rows={2} style={{ ...inputStyle, resize: "vertical" }} value={jobForm.data.description} onChange={(e) => jobForm.setData("description", e.target.value)} />{jobForm.errors.description && <span style={{ fontSize: 12, color: "#DC2626" }}>{jobForm.errors.description}</span>}</Field>
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
          <form onSubmit={submitAssessment} style={{ display: "grid", gap: 14 }}>
            {assessmentForm.errors.assessment && <div role="alert" style={{ fontSize: 12, color: "#B91C1C" }}>{assessmentForm.errors.assessment}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              <Field label="Skill this verifies *" error={assessmentForm.errors.skill} hint="Passing issues a verified badge for exactly this skill.">
                <input style={inputStyle} value={assessmentForm.data.skill} placeholder="e.g. React" onChange={(e) => assessmentForm.setData("skill", e.target.value)} />
              </Field>
              <Field label="Target role *" error={assessmentForm.errors.role}>
                <input style={inputStyle} value={assessmentForm.data.role} onChange={(e) => assessmentForm.setData("role", e.target.value)} />
              </Field>
            </div>
            <Field label="Assessment title *" error={assessmentForm.errors.title}>
              <input style={inputStyle} value={assessmentForm.data.title} onChange={(e) => assessmentForm.setData("title", e.target.value)} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Time limit (minutes)" error={assessmentForm.errors.durationMinutes}>
                <input type="number" min="1" max="180" style={inputStyle} value={assessmentForm.data.durationMinutes} onChange={(e) => assessmentForm.setData("durationMinutes", e.target.value)} />
              </Field>
              <Field label="Passing score (%)" error={assessmentForm.errors.passingScore} hint="50 to 100">
                <input type="number" min="50" max="100" style={inputStyle} value={assessmentForm.data.passingScore} onChange={(e) => assessmentForm.setData("passingScore", e.target.value)} />
              </Field>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.brownDeep }}>
                Questions ({assessmentForm.data.questions.length}) <span style={{ fontWeight: 400, fontSize: 12, color: COLORS.textLight }}>· at least 3 · candidates never see the answer key</span>
              </div>
              {assessmentForm.errors.questions && <div role="alert" style={{ fontSize: 12, color: "#B91C1C" }}>{assessmentForm.errors.questions}</div>}
              {assessmentForm.data.questions.map((q, qi) => (
                <fieldset key={qi} style={{ border: "1px solid " + COLORS.parchmentDeep, borderRadius: 10, padding: "10px 12px", margin: 0, display: "grid", gap: 8, background: COLORS.parchment }}>
                  <legend style={{ fontSize: 12, fontWeight: 700, color: COLORS.textMid, padding: "0 4px" }}>Question {qi + 1}</legend>
                  <Field label="Prompt" error={assessmentForm.errors[`questions.${qi}.prompt`]}>
                    <textarea rows={2} style={{ ...inputStyle, resize: "vertical" }} value={q.prompt} onChange={(e) => setQuestion(qi, { prompt: e.target.value })} />
                  </Field>
                  <div style={{ fontSize: 12, color: COLORS.textLight }}>Fill at least two options and select the correct one.</div>
                  {q.options.map((opt, oi) => (
                    <div key={oi} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input type="radio" name={`answer-${qi}`} aria-label={`Option ${oi + 1} is correct`} checked={q.answer === oi} onChange={() => setQuestion(qi, { answer: oi })} style={{ width: 18, height: 18 }} />
                      <input style={{ ...inputStyle, flex: 1 }} value={opt} placeholder={`Option ${oi + 1}`}
                        onChange={(e) => setQuestion(qi, { options: q.options.map((o, k) => (k === oi ? e.target.value : o)) })} />
                    </div>
                  ))}
                  {assessmentForm.errors[`questions.${qi}.answer`] && <span role="alert" style={{ fontSize: 12, color: "#B91C1C" }}>{assessmentForm.errors[`questions.${qi}.answer`]}</span>}
                  {assessmentForm.data.questions.length > (assessmentForm.data.taskOn ? 0 : 3) && (
                    <button type="button" style={{ ...ghostBtn, justifySelf: "start", padding: "4px 10px", color: "#B91C1C" }}
                      onClick={() => assessmentForm.setData("questions", assessmentForm.data.questions.filter((_, k) => k !== qi))}>Remove question</button>
                  )}
                </fieldset>
              ))}
              <button type="button" style={{ ...ghostBtn, justifySelf: "start" }} onClick={() => assessmentForm.setData("questions", [...assessmentForm.data.questions, blankQuestion()])}>
                <IconPlus size={13} /> Add question
              </button>
            </div>

            <fieldset style={{ border: `1px solid ${COLORS.parchmentDeep}`, borderRadius: 12, padding: "12px 14px", display: "grid", gap: 10, margin: 0 }}>
              <legend style={{ fontSize: 13, fontWeight: 700, color: COLORS.brownDeep, padding: "0 6px" }}>Practical task (optional)</legend>
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: COLORS.textDark, cursor: "pointer", minHeight: 32 }}>
                <input type="checkbox" checked={assessmentForm.data.taskOn} onChange={(e) => assessmentForm.setData("taskOn", e.target.checked)} />
                Add a real task the candidate does and submits, scored by your rubric
              </label>
              {assessmentForm.data.taskOn && (
                <>
                  <Field label="Task *" error={assessmentForm.errors.taskPrompt} hint="Describe the work, e.g. build a small page or fix a given bug, and what to hand in.">
                    <textarea rows={3} style={{ ...inputStyle, resize: "vertical" }} value={assessmentForm.data.taskPrompt} onChange={(e) => assessmentForm.setData("taskPrompt", e.target.value)} />
                  </Field>
                  <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: COLORS.textDark, cursor: "pointer", minHeight: 32 }}>
                    <input type="checkbox" checked={assessmentForm.data.taskFileRequired} onChange={(e) => assessmentForm.setData("taskFileRequired", e.target.checked)} />
                    A work file is required as proof (PDF, image, ZIP or Office file, up to 10 MB)
                  </label>
                  <div style={{ display: "grid", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>
                      Rubric ({assessmentForm.data.rubric.length} criteria, {assessmentForm.data.rubric.reduce((t, r) => t + Number(r.points || 0), 0)} points) · 2 to 6 criteria, 1 to 10 points each
                    </span>
                    {assessmentForm.errors.rubric && <span role="alert" style={{ fontSize: 12, color: "#B91C1C" }}>{assessmentForm.errors.rubric}</span>}
                    {assessmentForm.data.rubric.map((r, ri) => (
                      <div key={ri} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input style={{ ...inputStyle, flex: 1 }} aria-label={`Criterion ${ri + 1}`} placeholder={["e.g. Works as asked", "e.g. Code is clean and readable", "e.g. Matches the design"][ri] || `Criterion ${ri + 1}`}
                          value={r.criterion} onChange={(e) => setCriterion(ri, { criterion: e.target.value })} />
                        <input type="number" min="1" max="10" aria-label={`Points for criterion ${ri + 1}`} style={{ ...inputStyle, width: 72 }}
                          value={r.points} onChange={(e) => setCriterion(ri, { points: e.target.value })} />
                        {assessmentForm.data.rubric.length > 2 && (
                          <button type="button" aria-label={`Remove criterion ${ri + 1}`} style={{ ...ghostBtn, padding: "4px 10px", color: "#B91C1C" }}
                            onClick={() => assessmentForm.setData("rubric", assessmentForm.data.rubric.filter((_, k) => k !== ri))}>Remove</button>
                        )}
                      </div>
                    ))}
                    {assessmentForm.data.rubric.length < 6 && (
                      <button type="button" style={{ ...ghostBtn, justifySelf: "start" }} onClick={() => assessmentForm.setData("rubric", [...assessmentForm.data.rubric, { criterion: "", points: 5 }])}>
                        <IconPlus size={13} /> Add criterion
                      </button>
                    )}
                  </div>
                  <span style={{ fontSize: 12, color: COLORS.textLight }}>
                    Final score: the rubric percentage{assessmentForm.data.questions.length ? ", averaged with the quiz score" : ""}. It must reach the passing score above for the badge.
                  </span>
                </>
              )}
            </fieldset>

            <Field label="Instructions (optional)"><textarea rows={2} style={{ ...inputStyle, resize: "vertical" }} value={assessmentForm.data.instructions} onChange={(e) => assessmentForm.setData("instructions", e.target.value)} /></Field>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" style={ghostBtn} onClick={() => setAssessmentOpen(false)}>Cancel</button>
              <button type="submit" disabled={assessmentForm.processing} style={{ ...primaryBtn, opacity: assessmentForm.processing ? 0.6 : 1 }}>
                {assessmentForm.processing ? "Publishing…" : "Publish assessment"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Invite / top candidates modal */}
      {inviteOpen && (
        <Modal eyebrow="Top candidates" title="Best fits across your roles" onClose={() => setInviteOpen(false)}>
          <div style={{ display: "grid", gap: 10 }}>
            {topCandidates.length === 0 && <div style={{ fontSize: 13, color: COLORS.textMid }}>No candidates yet.</div>}
            {topCandidates.map((c) => (
              <div key={c.id} style={{ background: COLORS.parchment, borderRadius: 12, padding: "14px 16px", border: `1px solid ${COLORS.parchmentDeep}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.info}, ${COLORS.success})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{c.avatar}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.brownDeep }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: COLORS.textMid, marginTop: 2 }}>{c.role}{c.bestJobTitle ? ` · best fit: ${c.bestJobTitle}` : ""}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      {(c.skills || []).slice(0, 3).map((s) => <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 999, background: "#DCFCE7", fontSize: 12, color: "#15803D" }}><IconCheck size={9} /> {s}</span>)}
                      {c.claimed > 0 && <span style={{ padding: "3px 8px", borderRadius: 999, background: COLORS.cream, fontSize: 12, color: COLORS.textMid, border: `1px solid ${COLORS.parchmentDeep}` }}>+{c.claimed} self-reported</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 600, color: c.score >= 90 ? COLORS.success : COLORS.info }}>{c.score}%</div>
                    <div style={{ fontSize: 12, color: COLORS.textLight }}>skill score</div>
                  </div>
                  <button style={{ ...primaryBtn, opacity: c.bestJobId ? 1 : 0.6 }} onClick={() => invite(c.bestJobId, c.id)} disabled={!c.bestJobId}
                    aria-label={c.bestJobTitle ? `Invite ${c.name} to ${c.bestJobTitle}` : "Post a job first"}>Invite</button>
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
            <Field label="Company Name"><input style={inputStyle} value={profileForm.data.companyName} onChange={(e) => profileForm.setData("companyName", e.target.value)} />{profileForm.errors.companyName && <span style={{ fontSize: 12, color: "#DC2626" }}>{profileForm.errors.companyName}</span>}</Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Industry"><input style={inputStyle} value={profileForm.data.industry} onChange={(e) => profileForm.setData("industry", e.target.value)} /></Field>
              <Field label="Company Size"><input style={inputStyle} value={profileForm.data.companySize} onChange={(e) => profileForm.setData("companySize", e.target.value)} /></Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="City"><input style={inputStyle} value={profileForm.data.locationCity} onChange={(e) => profileForm.setData("locationCity", e.target.value)} /></Field>
              <Field label="Region"><input style={inputStyle} value={profileForm.data.locationRegion} onChange={(e) => profileForm.setData("locationRegion", e.target.value)} /></Field>
            </div>
            <Field label="Recruiter Name"><input style={inputStyle} value={profileForm.data.recruiterName} onChange={(e) => profileForm.setData("recruiterName", e.target.value)} /></Field>
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
