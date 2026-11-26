"use client";

import { NATIVES, ROLES, TARGETS, type Role, type Settings } from "@/lib/settings";

export default function SettingsPanel({
  s,
  set,
  onClose,
}: {
  s: Settings;
  set: (patch: Partial<Settings>) => void;
  onClose: () => void;
}) {
  return (
    <section className="panel" id="settings-panel" aria-label="Language settings">
      <div className="row sp">
        <h2>
          Language settings <span className="small">for both modes, saved on this device</span>
        </h2>
        <button className="btn ghost sm" onClick={onClose}>Done</button>
      </div>
      <div className="fields">
        <label className="f">
          <span>I am learning</span>
          <select value={s.target} onChange={(e) => set({ target: e.target.value })}>
            {TARGETS.map((t) => (
              <option key={t.code} value={t.code}>{t.label}</option>
            ))}
          </select>
        </label>
        <label className="f">
          <span>My first language</span>
          <select value={s.native} onChange={(e) => set({ native: e.target.value })}>
            <option value="">Not set</option>
            {NATIVES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <label className="f">
          <span>Model voice</span>
          <select value={s.voice} onChange={() => set({ voice: "browser" })}>
            <option value="browser">Browser voice (matches accent)</option>
          </select>
        </label>
        <label className="f">
          <span>I practise as</span>
          <select value={s.role} onChange={(e) => set({ role: e.target.value as Role })}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="small" style={{ marginTop: 12 }}>
        Coaching uses your first language to explain likely sound errors.
      </p>
    </section>
  );
}
