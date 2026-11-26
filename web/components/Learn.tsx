"use client";

import { useEffect, useRef, useState } from "react";
import CoachCard from "@/components/CoachCard";
import ProgressCard from "@/components/ProgressCard";
import type { HistoryItem } from "@/lib/history";
import { paraText, paraWords, plainMarkup, splitStress, type Markup, type MWord } from "@/lib/markup";
import { PRESETS } from "@/lib/presets";
import { recognitionSupported, speak, startRecognition, type RunState } from "@/lib/recognizer";
import { scoreSpeech, type SpeechScore } from "@/lib/score";
import { targetLabel, type Settings } from "@/lib/settings";

const TONE = { fall: "↘", rise: "↗", level: "→" } as const;
const OWN = -1;

type Run = { score: SpeechScore; wpm: number; gaps: number; para: number };

function Word({ w }: { w: MWord }) {
  const [pre, st, post] = splitStress(w);
  const cls = w.main ? "m" : "s";
  return (
    <>
      {st ? (
        <>
          {pre}
          <b className={cls}>{st}</b>
          {post}
        </>
      ) : (
        w.word
      )}
    </>
  );
}

export default function Learn({
  s,
  history,
  onHistory,
}: {
  s: Settings;
  history: HistoryItem[];
  onHistory: (h: HistoryItem) => void;
}) {
  const [sel, setSel] = useState(0);
  const [own, setOwn] = useState<Markup | null>(null);
  const [ownText, setOwnText] = useState("");
  const [marking, setMarking] = useState(false);
  const [markErr, setMarkErr] = useState("");
  const [para, setPara] = useState(0);
  const [listening, setListening] = useState(false);
  const [live, setLive] = useState("");
  const [msg, setMsg] = useState("");
  const [run, setRun] = useState<Run | null>(null);
  const handle = useRef<{ stop: () => void } | null>(null);
  const speakRef = useRef<HTMLElement | null>(null);

  const markup: Markup | null = sel === OWN ? own : PRESETS[sel].markup;
  const label = sel === OWN ? "Own text" : PRESETS[sel].name;
  const current = markup?.paras[para] ?? markup?.paras[0] ?? null;
  const target = current ? paraText(current) : "";

  useEffect(() => () => handle.current?.stop(), []);

  function reset() {
    handle.current?.stop();
    setRun(null);
    setLive("");
    setMsg("");
    setListening(false);
    setPara(0);
  }

  function choose(i: number) {
    setSel(i);
    reset();
  }

  async function markUp() {
    setMarking(true);
    setMarkErr("");
    try {
      const res = await fetch("/api/markup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: ownText.slice(0, 1500), target: targetLabel(s.target), native: s.native || "unknown" }),
      });
      if (!res.ok) throw new Error();
      const m = (await res.json()) as Markup;
      if (!m.paras?.length) throw new Error();
      setOwn(m);
      reset();
    } catch {
      setMarkErr("Mark-up is unavailable right now. You can still practise with plain phrases.");
    }
    setMarking(false);
  }

  function usePlain() {
    const m = plainMarkup(ownText);
    if (!m.paras.length) {
      setMarkErr("Type or paste some text first.");
      return;
    }
    setMarkErr("");
    setOwn(m);
    reset();
  }

  function practise(i: number) {
    setPara(i);
    setRun(null);
    setLive("");
    setMsg("");
    speakRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleMic() {
    if (listening) {
      handle.current?.stop();
      setMsg("Finishing…");
      return;
    }
    if (!recognitionSupported()) {
      setMsg("Live speaking needs Chrome, Edge or Safari. You can use Free practice to upload a recording instead.");
      return;
    }
    setRun(null);
    setLive("");
    setMsg("");
    setListening(true);
    handle.current = startRecognition(
      s.target,
      (st: RunState) => setLive([...st.finals, st.partial].join(" ").trim()),
      (st: RunState, error: string | null) => {
        setListening(false);
        if (error === "not-allowed" || error === "service-not-allowed") {
          setMsg("Microphone or speech access was declined. Allow it in your browser, or use Free practice to upload a recording.");
          return;
        }
        const heard = [...st.finals, st.partial].join(" ").trim();
        const score = scoreSpeech(target.split(" ").filter(Boolean), heard);
        if (!score) {
          setMsg("Nothing was heard. Check your microphone and try again.");
          return;
        }
        const secs = Math.max(1, (st.last - st.t0) / 1000);
        const wpm = Math.round((score.said.split(" ").length / secs) * 60);
        setRun({ score, wpm, gaps: st.gaps, para });
        setMsg("Done. Click a coral word to hear it, or get coaching.");
        onHistory({ d: Date.now(), mode: "Learn", label, pct: score.pct, detail: `${wpm} wpm` });
      },
    );
  }

  const coachBody = run
    ? {
        text: target,
        native: s.native || "unknown",
        audience: s.role,
        speech: {
          pct: run.score.pct,
          wpm: run.wpm,
          pauses: run.gaps,
          heardAs: run.score.words.filter((w) => w.k === "sub").map((w) => `${w.word} -> heard "${w.heard.join(" ")}"`).slice(0, 20),
          missed: run.score.words.filter((w) => w.k === "miss").map((w) => w.word).slice(0, 20),
        },
      }
    : null;

  return (
    <div className="grid">
      <div className="col">
        <section className="card">
          <h2>Choose a text</h2>
          <p className="status" style={{ marginTop: 2 }}>
            Ready-made practice texts, marked up for stress, breaths and falling or rising voice. Or use your own.
          </p>
          <div className="chips" role="group" aria-label="Practice texts">
            {PRESETS.map((p, i) => (
              <button className="chip" key={p.id} aria-pressed={sel === i} onClick={() => choose(i)}>
                {p.name}
              </button>
            ))}
            <button className="chip" aria-pressed={sel === OWN} onClick={() => choose(OWN)}>
              My own text
            </button>
          </div>
          {sel === OWN && (
            <div style={{ marginTop: 12 }}>
              <textarea
                value={ownText}
                onChange={(e) => setOwnText(e.target.value)}
                maxLength={1500}
                aria-label="Your own text"
                placeholder="Paste a short text (up to 1,500 characters)"
              />
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn" onClick={markUp} disabled={marking || !ownText.trim()}>
                  {marking ? "Marking up…" : "Mark up with Claude"}
                </button>
                <button className="btn ghost" onClick={usePlain} disabled={marking || !ownText.trim()}>
                  Use without mark-up
                </button>
              </div>
              {markErr && <p className="err">{markErr}</p>}
            </div>
          )}
        </section>

        {markup && (
          <>
            <section className="card">
              <h2>Marked-up script</h2>
              {markup.paras.map((p, pi) => (
                <div className={`para${pi === para ? " sel" : ""}`} key={pi}>
                  <div className="script">
                    {p.phrases.map((ph, i) => (
                      <span key={i}>
                        {ph.w.map((w, wi) => (
                          <span key={wi}>
                            <Word w={w} />
                            {w.link ? "‿" : " "}
                          </span>
                        ))}
                        <span className="tone">{TONE[ph.tone]}</span>
                        {i < p.phrases.length - 1 && <span className="bar2">|</span>}{" "}
                      </span>
                    ))}
                  </div>
                  <div className="row">
                    <button className="btn ghost sm" onClick={() => speak(paraText(p), s.target, 1)}>Listen</button>
                    <button className="btn ghost sm" onClick={() => speak(paraText(p), s.target, 0.7)}>Slow</button>
                    <button className="btn sm" onClick={() => practise(pi)}>Practise this</button>
                  </div>
                </div>
              ))}
              <div className="legend">
                <span><b style={{ color: "var(--brand)" }}>Blue</b> stressed</span>
                <span><b style={{ color: "var(--acc)", textDecoration: "underline" }}>Coral</b> main stress</span>
                <span>{"‿"} link</span>
                <span>{"↘"} fall</span>
                <span>{"↗"} rise</span>
              </div>
              {markup.focus.length > 0 && (
                <>
                  <h3 style={{ marginTop: 16 }}>Focus for this text</h3>
                  <ul className="tight">
                    {markup.focus.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </>
              )}
            </section>
            {markup.tricky.length > 0 && (
              <section className="card">
                <h2>Words to drill</h2>
                <div className="scroll" style={{ marginTop: 8 }}>
                  <table>
                    <thead>
                      <tr><th>Word</th><th>Say it as</th><th>Watch out for</th></tr>
                    </thead>
                    <tbody>
                      {markup.tricky.map((t, i) => (
                        <tr key={i}>
                          <td><strong>{t.word}</strong></td>
                          <td>{t.say}</td>
                          <td>{t.tip}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <div className="col">
        <section className="card" ref={speakRef}>
          <div className="row sp">
            <h2>Speak it</h2>
            <button className="btn ghost sm" onClick={() => speak(target, s.target, 1)} disabled={!target}>Hear model</button>
          </div>
          <div className="target">{target || "Choose a text, or mark up your own, to start."}</div>
          <div className="row">
            <button className={`btn${listening ? " rec" : ""}`} onClick={toggleMic} disabled={!target}>
              {listening ? "Stop" : "Speak"}
            </button>
            <span className="small">{msg || "Press, read the paragraph aloud, press again to finish."}</span>
          </div>
          <div className="live" aria-live="polite">{live}</div>
          {run && current && (
            <div>
              <div className="score">
                <div className="big">{run.score.pct}%</div>
                <div>
                  <strong>words understood</strong>
                  <div className="small">
                    About {run.wpm} words per minute, {run.gaps} noticeable pause{run.gaps === 1 ? "" : "s"} (approx.)
                  </div>
                </div>
              </div>
              <p className="mt" style={{ lineHeight: 1.8 }}>
                {run.score.words.map((w, i) => (
                  <span key={i}>
                    <span
                      className={`w ${w.k}`}
                      title={w.k === "sub" ? `Heard: ${w.heard.join(" ")}` : w.k === "miss" ? "Not heard" : undefined}
                      onClick={() => w.k !== "ok" && speak(w.word, s.target, 0.75)}
                    >
                      {w.word}
                    </span>{" "}
                  </span>
                ))}
              </p>
              <p className="status">
                The score shows how well a speech recogniser understood you. It is a guide to clarity, not a sound-by-sound check.
              </p>
            </div>
          )}
        </section>
        <CoachCard
          body={coachBody}
          ready={!!run}
          idleHint="After you speak, the coach turns your result into specific fixes and drills."
          button="Get corrections"
          privacy="Sends the text, your score and which words were misheard, never audio."
        />
        <ProgressCard items={history} />
      </div>
    </div>
  );
}
