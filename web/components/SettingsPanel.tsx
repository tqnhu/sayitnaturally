"use client";

import { useEffect, useState } from "react";
import { speak, voicesFor } from "@/lib/recognizer";
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
  const [voices, setVoices] = useState<{ name: string; lang: string }[]>([]);
  useEffect(() => {
    const load = () => setVoices(voicesFor(s.target).map((v) => ({ name: v.name, lang: v.lang })));
    load();
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, [s.target]);

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
          <select value={s.voiceName} onChange={(e) => set({ voiceName: e.target.value })}>
            <option value="">Automatic (best on this device)</option>
            {voices.map((v) => (
              <option key={v.name} value={v.name}>{v.name}</option>
            ))}
          </select>
          <button
            type="button"
            className="btn ghost sm"
            style={{ justifySelf: "start" }}
            onClick={() => speak("Say it naturally: let your voice fall at the end.", s.target, 1, s.voiceName)}
          >
            Test voice
          </button>
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
        Voices come from your device and browser, so the choice differs between devices. Coaching uses your first language to explain likely sound errors.
      </p>
    </section>
  );
}
