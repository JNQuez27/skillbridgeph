import { useEffect, useRef, useState } from "react";
import { COLORS, FONT_DISPLAY, FONT_BODY } from "../styles/ui";

const btn = { padding: "8px 14px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT_BODY, minHeight: 44 };

const xsrf = () => decodeURIComponent((document.cookie.match(/XSRF-TOKEN=([^;]+)/) || [])[1] || "");
const api = (url, method = "GET") => fetch(url, {
  method, credentials: "same-origin",
  headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest", ...(method === "POST" ? { "X-XSRF-TOKEN": xsrf() } : {}) },
}).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))));

const pickMime = () => ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find((m) => window.MediaRecorder?.isTypeSupported?.(m)) || "";

/**
 * Records a hands-on demo with the camera, inside SkillBridge. The server reveals
 * each prompt (spoken codes, a physical action) only when its moment comes, so the
 * video has to be made live: a pre-made or generated clip cannot contain them.
 */
export default function VideoRecorder({ onRecorded }) {
  const preview = useRef(null);
  const stream = useRef(null);
  const recorder = useRef(null);
  const chunks = useRef([]);
  const poll = useRef(null);
  const [phase, setPhase] = useState("idle"); // idle | ready | recording | done
  const [error, setError] = useState("");
  const [prompts, setPrompts] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const [canStop, setCanStop] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [clipUrl, setClipUrl] = useState("");

  const stopCamera = () => {
    clearInterval(poll.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };
  useEffect(() => stopCamera, []);

  const openCamera = async () => {
    setError("");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: true });
      setPhase("ready");
      requestAnimationFrame(() => { if (preview.current) preview.current.srcObject = stream.current; });
    } catch {
      setError("Camera or microphone was blocked. Allow access in your browser and try again.");
    }
  };

  const start = async () => {
    setError("");
    try {
      const session = await api("/credentials/recording", "POST");
      chunks.current = [];
      const mime = pickMime();
      recorder.current = new MediaRecorder(stream.current, mime ? { mimeType: mime } : undefined);
      recorder.current.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      recorder.current.onstop = () => {
        const type = recorder.current.mimeType || "video/webm";
        const blob = new Blob(chunks.current, { type });
        const file = new File([blob], `demo-${Date.now()}.${type.includes("mp4") ? "mp4" : "webm"}`, { type: type.split(";")[0] });
        setClipUrl(URL.createObjectURL(blob));
        stopCamera();
        setPhase("done");
        onRecorded(file, session.recordingId);
      };
      recorder.current.start(1000);
      setPrompts(session.prompts);
      setRemaining(2);
      setPhase("recording");
      poll.current = setInterval(async () => {
        try {
          const s = await api("/credentials/recording/prompts");
          setPrompts(s.prompts);
          setElapsed(s.elapsed);
          setRemaining(s.remaining);
          setCanStop(s.canStop);
        } catch { /* keep recording; the next poll retries */ }
      }, 1000);
    } catch {
      setError("Could not start the recording. Refresh the page and try again.");
    }
  };

  const stop = () => recorder.current?.state === "recording" && recorder.current.stop();
  const redo = () => { setClipUrl(""); setPrompts([]); setElapsed(0); setCanStop(false); onRecorded(null, null); openCamera(); };
  const current = prompts[prompts.length - 1];

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {phase === "idle" && (
        <div><button type="button" onClick={openCamera} style={{ ...btn, background: COLORS.info, color: "#fff" }}>Open camera</button></div>
      )}

      {(phase === "ready" || phase === "recording") && (
        <div style={{ position: "relative", maxWidth: 480 }}>
          <video ref={preview} autoPlay muted playsInline style={{ width: "100%", borderRadius: 10, background: "#000" }} />
          {phase === "recording" && current && (
            <div role="status" aria-live="assertive" style={{ position: "absolute", left: 10, right: 10, bottom: 10, background: "rgba(12,74,110,0.92)", color: "#fff", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Prompt {prompts.length} of {prompts.length + remaining} · {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700 }}>{current.text}</div>
            </div>
          )}
        </div>
      )}

      {phase === "ready" && (
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, color: COLORS.textMid }}>
            When you press Start, prompts will appear on screen at random moments. Do each one on camera while you demonstrate the task.
            You can stop after the last prompt.
          </div>
          <div><button type="button" onClick={start} style={{ ...btn, background: "#B91C1C", color: "#fff" }}>● Start recording</button></div>
        </div>
      )}

      {phase === "recording" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={stop} disabled={!canStop} style={{ ...btn, background: canStop ? COLORS.brownDeep : COLORS.parchmentDeep, color: canStop ? "#fff" : COLORS.textMid, cursor: canStop ? "pointer" : "not-allowed" }}>
            ■ Stop recording
          </button>
          {!canStop && <span style={{ fontSize: 12, color: COLORS.textMid }}>Keep going: more prompts are coming.</span>}
        </div>
      )}

      {phase === "done" && (
        <div style={{ display: "grid", gap: 8, maxWidth: 480 }}>
          <video src={clipUrl} controls style={{ width: "100%", borderRadius: 10, background: "#000" }} />
          <div style={{ fontSize: 12, color: COLORS.textMid }}>Recording ready. Upload it below, or record again.</div>
          <div><button type="button" onClick={redo} style={{ ...btn, background: "transparent", border: `1px solid ${COLORS.parchmentDeep}`, color: COLORS.brownDeep }}>Record again</button></div>
        </div>
      )}

      {error && <div role="alert" style={{ fontSize: 12, color: "#B91C1C" }}>{error}</div>}
    </div>
  );
}
