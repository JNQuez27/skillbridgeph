import { useState } from "react";
import { router } from "@inertiajs/react";
import { COLORS, FONT_DISPLAY, FONT_BODY } from "../styles/ui";
import { IconBuilding, IconAward, IconCheck, IconClipboardCheck } from "../components/Icons";
import PreCheckList from "../components/PreCheckList";

const sectionMeta = {
  companies: { label: "Companies to verify", sub: "Check each company's DTI or SEC registration once. Only approved companies can post jobs and issue badges." },
  certificates: { label: "Certificates to verify", sub: "Check each TESDA certificate or PRC license once. Every employer then sees the same recorded result." },
  assessments: { label: "Assessments", sub: "Every company's tests, answer keys included. Suspend one that is broken, unfair, or gives answers away; a suspended test stops issuing badges." },
  history: { label: "Decision history", sub: "Every approval and rejection, with who made it, when, and why." },
};

const cardStyle = { background: COLORS.cream, borderRadius: 14, padding: "22px 20px", border: `1px solid ${COLORS.parchmentDeep}` };
const headingStyle = { fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 600, color: COLORS.brownDeep, marginBottom: 4 };
const primaryBtn = { padding: "8px 14px", borderRadius: 8, background: COLORS.info, border: "none", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT_BODY, display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", minHeight: 44 };
const ghostBtn = { padding: "8px 14px", borderRadius: 8, background: "transparent", border: `1px solid ${COLORS.parchmentDeep}`, color: COLORS.brownDeep, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT_BODY, display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", minHeight: 44 };
const inputStyle = { padding: "10px 12px", borderRadius: 10, border: `1px solid ${COLORS.parchmentDeep}`, background: COLORS.cream, fontSize: 13, color: COLORS.textDark, fontFamily: FONT_BODY };

const STATUS = {
  approved: { label: "Approved", bg: "rgba(22,163,74,0.14)", color: "#15803D" },
  verified: { label: "Confirmed", bg: "rgba(22,163,74,0.14)", color: "#15803D" },
  rejected: { label: "Rejected", bg: "rgba(185,28,28,0.12)", color: "#B91C1C" },
  pending: { label: "Pending", bg: "rgba(3,105,161,0.14)", color: "#0369A1" },
};

// Patent Fig. 2, 232: the administrator portal moderates assessments.
function AssessmentModeration({ assessments }) {
  const [filter, setFilter] = useState("flagged");
  const counts = {
    flagged: assessments.filter((a) => a.flags.length && a.status === "Active").length,
    Active: assessments.filter((a) => a.status === "Active").length,
    Suspended: assessments.filter((a) => a.status === "Suspended").length,
  };
  const shown = assessments.filter((a) => (filter === "flagged" ? a.flags.length && a.status === "Active" : a.status === filter));
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div role="group" aria-label="Filter assessments" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[["flagged", "Needs a look"], ["Active", "Active"], ["Suspended", "Suspended"]].map(([k, l]) => (
          <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}
            style={{ ...ghostBtn, minHeight: 36, background: filter === k ? COLORS.info : "transparent", color: filter === k ? "#fff" : COLORS.brownDeep, borderColor: filter === k ? COLORS.info : COLORS.parchmentDeep }}>
            {l} ({counts[k]})
          </button>
        ))}
      </div>
      {shown.length === 0 && <Empty>{filter === "flagged" ? "No active assessment has a warning right now. Browse Active to read any test." : "None."}</Empty>}
      {shown.map((a) => <ModerationCard key={a.id} a={a} />)}
    </div>
  );
}

function ModerationCard({ a }) {
  const [note, setNote] = useState("");
  const [suspending, setSuspending] = useState(false);
  const [busy, setBusy] = useState(false);
  const decide = (decision) => {
    setBusy(true);
    router.post(`/admin/assessments/${a.id}`, { decision, note }, { preserveScroll: true, onFinish: () => setBusy(false) });
  };
  const suspended = a.status === "Suspended";
  return (
    <div style={{ ...cardStyle, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.brownDeep }}>{a.title}</div>
          <div style={{ fontSize: 12, color: COLORS.textMid, marginTop: 2 }}>
            {a.company} · verifies <strong>{a.skill}</strong> · {a.questions.length} questions{a.taskPrompt ? " + practical task" : ""} · {a.durationMinutes} min · pass {a.passingScore}%
          </div>
          <div style={{ fontSize: 12, color: COLORS.textLight, marginTop: 2 }}>{a.attempts} scored attempt(s) · {a.passed} passed</div>
        </div>
        <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: suspended ? "rgba(185,28,28,0.12)" : "rgba(22,163,74,0.14)", color: suspended ? "#B91C1C" : "#15803D" }}>{a.status}</span>
      </div>
      {a.flags.length > 0 && (
        <ul aria-label="Warnings" style={{ margin: 0, padding: "8px 12px 8px 28px", borderRadius: 10, background: "#FFFBEB", border: "1px solid #FDE68A", fontSize: 12, color: "#92400E" }}>
          {a.flags.map((f) => <li key={f}>{f}</li>)}
        </ul>
      )}
      <details style={{ fontSize: 13, color: COLORS.textDark }}>
        <summary style={{ cursor: "pointer", fontWeight: 600, color: COLORS.info, minHeight: 28 }}>Read the questions and answer key</summary>
        <ol style={{ margin: "8px 0 0", paddingLeft: 20, display: "grid", gap: 8 }}>
          {a.questions.map((q, i) => (
            <li key={i}>
              {q.prompt}
              <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12, color: COLORS.textMid }}>
                {q.options.map((o, oi) => (
                  <li key={oi} style={oi === q.answer ? { color: "#15803D", fontWeight: 700 } : undefined}>{o}{oi === q.answer ? " (correct)" : ""}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
        {a.taskPrompt && (
          <div style={{ marginTop: 10, fontSize: 12, color: COLORS.textMid }}>
            <strong>Practical task:</strong> {a.taskPrompt}<br />
            <strong>Rubric:</strong> {(a.rubric || []).map((r) => `${r.criterion} (${r.points} pts)`).join(" · ")}
          </div>
        )}
      </details>
      {a.moderatedAt && (
        <div style={{ fontSize: 12, color: COLORS.textLight }}>
          Last {suspended ? "suspended" : "reinstated"} by {a.moderatedBy} · {a.moderatedAt}{suspended && a.note ? ` · reason: ${a.note}` : ""}
        </div>
      )}
      {suspended ? (
        <button type="button" disabled={busy} style={{ ...ghostBtn, justifySelf: "start" }} onClick={() => decide("reinstate")}>Reinstate</button>
      ) : suspending ? (
        <div style={{ display: "grid", gap: 8 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Reason (shown to the company)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Question 3's marked answer is wrong" style={inputStyle} />
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={ghostBtn} onClick={() => setSuspending(false)}>Cancel</button>
            <button type="button" disabled={!note.trim() || busy} onClick={() => decide("suspend")}
              style={{ ...primaryBtn, background: "#B91C1C", opacity: !note.trim() || busy ? 0.6 : 1 }}>Suspend assessment</button>
          </div>
        </div>
      ) : (
        <button type="button" style={{ ...ghostBtn, justifySelf: "start", color: "#B91C1C" }} onClick={() => setSuspending(true)}>Suspend…</button>
      )}
    </div>
  );
}

function StatusChip({ status }) {
  const s = STATUS[status] || STATUS.pending;
  return <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>;
}

function Detail({ k, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
      <span style={{ color: COLORS.textLight }}>{k}</span>
      <span style={{ color: COLORS.textDark, fontWeight: 600, textAlign: "right", wordBreak: "break-word" }}>{v || "—"}</span>
    </div>
  );
}

// Open the official source, then approve, or reject with a reason the
// company / applicant will see.
function Decision({ url, who }) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const decide = (decision) => {
    setBusy(true);
    router.post(url, { decision, note }, { preserveScroll: true, onFinish: () => setBusy(false) });
  };

  if (rejecting) {
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMid }}>Reason (shown to the {who})</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. No record found in the registry" style={inputStyle} />
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" style={ghostBtn} onClick={() => setRejecting(false)}>Cancel</button>
          <button type="button" disabled={!note.trim() || busy} onClick={() => decide("reject")}
            style={{ ...primaryBtn, background: "#B91C1C", opacity: !note.trim() || busy ? 0.6 : 1 }}>Confirm reject</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button type="button" disabled={busy} onClick={() => decide("approve")} style={{ ...primaryBtn, background: COLORS.success, opacity: busy ? 0.6 : 1 }}>
        <IconCheck size={13} /> Approve
      </button>
      <button type="button" style={ghostBtn} onClick={() => setRejecting(true)}>Reject…</button>
    </div>
  );
}

function SourceLinks({ lookupUrl, lookupLabel, fileUrl, fileLabel }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {lookupUrl && <a href={lookupUrl} target="_blank" rel="noopener noreferrer" style={primaryBtn}>{lookupLabel} ↗</a>}
      {fileUrl
        ? <a href={fileUrl} target="_blank" rel="noopener noreferrer" style={ghostBtn}>{fileLabel} ↗</a>
        : <span style={{ fontSize: 12, color: COLORS.textLight, alignSelf: "center" }}>No file uploaded</span>}
    </div>
  );
}

function Empty({ children }) {
  return <div style={{ ...cardStyle, borderStyle: "dashed", fontSize: 13, color: COLORS.textMid }}>{children}</div>;
}

function QueueCard({ icon, title, details, guidance, links, decision, extra = null }) {
  return (
    <div style={{ ...cardStyle, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
      <div style={{ display: "grid", gap: 8, alignContent: "start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 38, height: 38, borderRadius: 10, background: COLORS.parchmentDark, color: COLORS.info, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</span>
          <h2 style={headingStyle}>{title}</h2>
        </div>
        {details.map(([k, v]) => <Detail key={k} k={k} v={v} />)}
        {extra}
      </div>
      <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
        <p style={{ fontSize: 13, color: COLORS.textMid, margin: 0 }}>{guidance}</p>
        {links}
        {decision}
      </div>
    </div>
  );
}

function HistoryList({ title, items, label }) {
  return (
    <div style={cardStyle}>
      <h2 style={{ ...headingStyle, marginBottom: 12 }}>{title}</h2>
      {items.length === 0 && <div style={{ fontSize: 12, color: COLORS.textLight }}>No decisions yet.</div>}
      {items.map((item) => (
        <div key={item.id} style={{ display: "grid", gap: 4, padding: "10px 0", borderTop: `1px solid ${COLORS.parchmentDark}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.brownDeep }}>{label(item)}</span>
            <StatusChip status={item.status} />
          </div>
          <div style={{ fontSize: 12, color: COLORS.textLight }}>
            {[item.reviewedBy || item.checkedBy, item.reviewedAt || item.checkedAt].filter(Boolean).join(" · ") || "Recorded before admin reviews"}
            {item.note ? ` — ${item.note}` : ""}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminView({ account, activeTab = "companies" }) {
  const tab = sectionMeta[activeTab] ? activeTab : "companies";
  const employers = account?.employers || { pending: [], decided: [] };
  const credentials = account?.credentials || { pending: [], decided: [] };
  const assessments = account?.assessments || [];
  const decidedCount = employers.decided.length + credentials.decided.length;

  return (
    <div style={{ padding: "28px 32px", fontFamily: FONT_BODY, background: COLORS.parchment, minHeight: "calc(100vh - 64px)" }}>
      {/* Header banner: same pattern as the applicant and employer dashboards */}
      <div style={{
        background: `linear-gradient(120deg, ${COLORS.brownDeep}, ${COLORS.brownMid})`,
        borderRadius: 18, padding: "28px 32px", marginBottom: 24,
        display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap",
        boxShadow: "0 20px 44px rgba(12, 74, 110, 0.22)",
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          background: `linear-gradient(135deg, ${COLORS.info}, ${COLORS.success})`,
          display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0,
          border: "3px solid rgba(255,255,255,0.25)",
        }}><IconClipboardCheck size={34} /></div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 600, color: "#fff", marginBottom: 4 }}>Verification desk</h2>
          <p style={{ color: "rgba(224,242,254,0.85)", fontSize: 13, marginBottom: 12 }}>
            Each company and certificate is checked once, here, so no employer has to check it again.
          </p>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.12)", color: "#fff", padding: "4px 11px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
            SkillBridge PH admin
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {[[employers.pending.length, "Companies"], [credentials.pending.length, "Certificates"], [decidedCount, "Decided"]].map(([v, l]) => (
            <div key={l} style={{ textAlign: "center", background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 16px", minWidth: 76 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: COLORS.goldLight, fontWeight: 700 }}>{v}</div>
              <div style={{ fontSize: 12, color: "rgba(224,242,254,0.7)" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Section heading */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 600, color: COLORS.brownDeep }}>{sectionMeta[tab].label}</h1>
        <p style={{ fontSize: 12, color: COLORS.textLight }}>{sectionMeta[tab].sub}</p>
      </div>

      {tab === "companies" && (
        <div style={{ display: "grid", gap: 16 }}>
          {employers.pending.length === 0 && <Empty>No companies waiting for verification.</Empty>}
          {employers.pending.map((e) => (
            <QueueCard
              key={e.id}
              icon={<IconBuilding size={18} />}
              title={e.companyName}
              details={[["Registration", `${e.registrationType} ${e.registrationNumber}`], ["Industry", e.industry], ["Location", e.location], ["Recruiter", e.recruiter], ["Account email", e.accountEmail]]}
              guidance={<>The {e.registrationType} registry uses a CAPTCHA, so search it yourself for this number. Approve only if the registered name matches <strong>{e.companyName}</strong> and the permit. The automatic pre-check helps, but a forged permit can pass it.</>}
              extra={<PreCheckList checks={e.precheck} title={`Automatic pre-check (step 530)${e.precheckAt ? ` · ${e.precheckAt}` : ""}`} />}
              links={<SourceLinks lookupUrl={e.lookupUrl} lookupLabel={`Open ${e.registrationType} registry`} fileUrl={e.permitUrl} fileLabel="View permit" />}
              decision={<Decision url={`/admin/employers/${e.id}`} who="company" />}
            />
          ))}
        </div>
      )}

      {tab === "certificates" && (
        <div style={{ display: "grid", gap: 16 }}>
          {credentials.pending.length === 0 && <Empty>No certificates waiting for a registry check.</Empty>}
          {credentials.pending.map((c) => (
            <QueueCard
              key={c.id}
              icon={<IconAward size={18} />}
              title={c.qualification}
              details={[["Registry", c.registryLabel], ["Number", c.number], ["Holder (account name)", c.holder]]}
              guidance={c.registry === "tesda"
                ? <>The TESDA link opens the registry already searched for <strong>{c.firstName} {c.surname}</strong> and this number. Approve only if one record matches this qualification.</>
                : <>PRC&apos;s site uses a CAPTCHA, so search it by hand for <strong>{c.holder}</strong> and this license number.</>}
              links={<SourceLinks lookupUrl={c.lookupUrl} lookupLabel={`Open ${c.registryLabel}`} fileUrl={c.fileUrl} fileLabel="View certificate" />}
              decision={<Decision url={`/admin/credentials/${c.id}`} who="applicant" />}
            />
          ))}
        </div>
      )}

      {tab === "assessments" && <AssessmentModeration assessments={assessments} />}

      {tab === "history" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 22 }}>
          <HistoryList title="Companies" items={employers.decided}
            label={(e) => e.registrationNumber ? `${e.companyName} (${e.registrationType} ${e.registrationNumber})` : e.companyName} />
          <HistoryList title="Certificates" items={credentials.decided} label={(c) => `${c.qualification} — ${c.holder}`} />
        </div>
      )}
    </div>
  );
}
