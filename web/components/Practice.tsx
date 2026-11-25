"use client";

import { useRef, useState } from "react";
import { analyseBlob } from "@/lib/audio";
import { AnalysisError, METERS, fmtTime, type Analysis } from "@/lib/analysis";

const SAMPLE =
  "Learning to speak a new language is less about perfect sounds and more about rhythm. " +
  "Say each phrase in one breath, lift your voice on the important word, and let your voice fall at the end of a statement.";

type Phase = "idle" | "recording" | "analysing";

export default function Practice() {
  const [text, setText] = useState(SAMPLE);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<Analysis | null>(null);
  const [error, setError] = useState("");
  const [secs, setSecs] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function run(blob: Blob) {
    setPhase("analysing");
    setError("");
    try {
      setResult(await analyseBlob(blob));
    } catch (e) {
      setResult(null);
      setError(
        e instanceof AnalysisError
          ? "Could not find enough speech. Try again closer to the microphone in a quiet place."
          : "This audio could not be read. Try recording again, or upload an .m4a, .mp3 or .wav file.",
      );
    }
    setPhase("idle");
  }

  async function start() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timer.current) clearInterval(timer.current);
        run(new Blob(chunks.current, { type: mr.mimeType }));
      };
      recorder.current = mr;
      mr.start();
      setSecs(0);
      timer.current = setInterval(() => setSecs((s) => s + 1), 1000);
      setPhase("recording");
    } catch {
      setError("Microphone access was declined or is not available. You can upload a recording instead.");
    }
  }

  function stop() {
    recorder.current?.stop();
  }

  return (
    <>
      <section className="card">
        <h2>1. Your text</h2>
        <textarea value={text} onChange={(e) => setText(e.target.value)} aria-label="Text to read aloud" />
        <p className="status">Paste a presentation, a pitch or an email, or use this sample.</p>
      </section>

      <section className="card">
        <h2>2. Read it aloud</h2>
        <div className="row">
          {phase === "recording" ? (
            <button className="rec" onClick={stop}>
              Stop ({fmtTime(secs)})
            </button>
          ) : (
            <button onClick={start} disabled={phase === "analysing"}>
              Record
            </button>
          )}
          <label className="btn ghost">
            Upload a recording
            <input
              type="file"
              accept="audio/*"
              hidden
              disabled={phase !== "idle"}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) run(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <p className="status">
          {phase === "analysing" ? "Analysing…" : "Your voice is analysed in your browser and is not uploaded."}
        </p>
        {error && <p className="err">{error}</p>}
      </section>

      {result && <Results a={result} />}
    </>
  );
}

function Results({ a }: { a: Analysis }) {
  return (
    <section className="card">
      <h2>3. How it sounded ({a.dur}s)</h2>
      {METERS.map((m) => {
        const v = (a[m.key] ?? 0) as number;
        const p = (n: number) => Math.max(0, Math.min(100, (100 * n) / m.max));
        const good = v >= m.lo && v <= m.hi;
        const hint = good
          ? "On target."
          : v > m.hi && "tooHigh" in m
            ? m.tooHigh
            : v > m.hi
              ? "Above the usual range."
              : m.tip;
        return (
          <div className="mt" key={m.key}>
            <div className="lab">
              <span>{m.label}</span>
              <span>
                {v} {m.unit}
              </span>
            </div>
            <div className="track">
              <div className="zone" style={{ left: `${p(m.lo)}%`, width: `${p(m.hi) - p(m.lo)}%` }} />
              <div className="dot" style={{ left: `${p(v)}%`, background: good ? "var(--brand)" : "var(--acc)" }} />
            </div>
            <small>
              Native target {m.lo}–{m.hi}. {hint}
            </small>
          </div>
        );
      })}
      {a.longPauses.length > 0 && <p className="status">Long pauses at {a.longPauses.join(", ")}.</p>}
      <Pitch a={a} />
    </section>
  );
}

function Pitch({ a }: { a: Analysis }) {
  const W = 700,
    H = 160,
    L = 34,
    B = 22,
    T = 8;
  const dur = a.frames / 100;
  const pw = W - L - 8,
    ph = H - B - T;
  const X = (t: number) => L + (pw * t) / dur;
  const Y = (v: number) => T + ph * (1 - (Math.max(-8, Math.min(8, v)) + 8) / 16);
  let d = "";
  a.st.forEach((v, i) => {
    if (!isNaN(v)) d += `M${X(i * 0.02).toFixed(1)} ${Y(v).toFixed(1)}h1.6`;
  });
  const step = Math.ceil(dur / 8 / 5) * 5 || 5;
  const ticks: number[] = [];
  for (let t = 0; t <= dur; t += step) ticks.push(t);
  return (
    <svg className="pitch" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Your pitch over time, in semitones around your average">
      {a.pauses.map((p, i) => (
        <rect key={i} x={X(p.at)} y={T} width={Math.max(1, X(p.at + p.len) - X(p.at))} height={ph} fill="var(--soft)" />
      ))}
      {[-6, 0, 6].map((v) => (
        <g key={v}>
          <line x1={L} x2={W - 8} y1={Y(v)} y2={Y(v)} stroke="var(--line)" />
          <text x={L - 6} y={Y(v) + 4} fontSize="12" textAnchor="end" fill="var(--mute)">
            {v > 0 ? "+" : ""}
            {v}
          </text>
        </g>
      ))}
      <path d={d} stroke="var(--acc)" strokeWidth="3" strokeLinecap="round" fill="none" />
      {ticks.map((t) => (
        <text key={t} x={X(t)} y={H - 5} fontSize="12" textAnchor="middle" fill="var(--mute)">
          {fmtTime(t)}
        </text>
      ))}
    </svg>
  );
}
