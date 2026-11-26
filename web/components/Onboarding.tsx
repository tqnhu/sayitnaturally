"use client";

import { useState } from "react";
import { NATIVES, ROLES, TARGETS, type Role, type Settings } from "@/lib/settings";

export default function Onboarding({ initial, onDone }: { initial: Settings; onDone: (s: Settings) => void }) {
  const [target, setTarget] = useState(initial.target);
  const [native, setNative] = useState(initial.native);
  const [role, setRole] = useState<Role>(initial.role);
  return (
    <section className="panel" aria-label="Welcome">
      <h2>Welcome to SayIt. Three quick questions.</h2>
      <p className="small" style={{ marginTop: 4 }}>
        Your answers are saved on this device and you can change them any time in Settings.
      </p>
      <div className="fields" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <label className="f">
          <span>Which language are you learning?</span>
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            {TARGETS.map((t) => (
              <option key={t.code} value={t.code}>{t.label}</option>
            ))}
          </select>
        </label>
        <label className="f">
          <span>What is your first language?</span>
          <select value={native} onChange={(e) => setNative(e.target.value)}>
            <option value="">Choose one</option>
            {NATIVES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <label className="f">
          <span>You practise as</span>
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="row" style={{ marginTop: 14 }}>
        <button className="btn" onClick={() => onDone({ ...initial, target, native, role, onboarded: true })}>
          Start practising
        </button>
        <button className="btn ghost" onClick={() => onDone({ ...initial, onboarded: true })}>
          Skip for now
        </button>
      </div>
    </section>
  );
}
