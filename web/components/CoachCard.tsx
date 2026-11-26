"use client";

import { useState } from "react";
import type { CoachReply } from "@/lib/coach";

export default function CoachCard({
  body,
  ready,
  idleHint,
  button = "Get coaching",
  privacy,
}: {
  body: Record<string, unknown> | null; // request body for /api/coach; null until there is something to coach
  ready: boolean;
  idleHint: string;
  button?: string;
  privacy: string;
}) {
  const [coach, setCoach] = useState<CoachReply | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function go() {
    if (!body) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 429) {
        setErr("You are going fast. Wait a minute, then try again.");
        setBusy(false);
        return;
      }
      if (!res.ok) throw new Error();
      setCoach(await res.json());
    } catch {
      setErr("Coaching is unavailable right now. Your results are still correct.");
    }
    setBusy(false);
  }

  return (
    <section className="card">
      <div className="row sp">
        <h2>Coaching</h2>
        <button className="btn sm" onClick={go} disabled={!ready || busy}>
          {busy ? "Coach is thinking…" : button}
        </button>
      </div>
      <p className="status">{ready ? privacy : idleHint}</p>
      {err && <p className="err">{err}</p>}
      {coach && (
        <div style={{ marginTop: 12 }}>
          <h3>{coach.headline}</h3>
          {coach.strengths.length > 0 && (
            <ul className="tight">
              {coach.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
          {coach.fixes.map((f, i) => (
            <div className="mt" key={i}>
              <strong>{f.issue}</strong>
              <div>{f.why}</div>
              <small>Try: {f.drill}</small>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
