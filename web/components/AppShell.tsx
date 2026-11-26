"use client";

import { useEffect, useState } from "react";
import FreePractice from "@/components/FreePractice";
import Learn from "@/components/Learn";
import Onboarding from "@/components/Onboarding";
import SettingsPanel from "@/components/SettingsPanel";
import { loadHistory, saveHistory, type HistoryItem } from "@/lib/history";
import { DEFAULTS, loadSettings, saveSettings, summary, type Settings } from "@/lib/settings";

type Mode = "learn" | "free";

export default function AppShell() {
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode>("learn");
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    setS(loadSettings());
    setHistory(loadHistory());
    if (location.hash === "#free") setMode("free");
    setReady(true);
  }, []);

  function update(patch: Partial<Settings>) {
    setS((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }

  function pick(m: Mode) {
    setMode(m);
    try {
      window.history.replaceState(null, "", m === "free" ? "#free" : "#learn");
    } catch {
      /* ignore */
    }
  }

  function addHistory(h: HistoryItem) {
    setHistory((prev) => {
      const next = [h, ...prev].slice(0, 40);
      saveHistory(next);
      return next;
    });
  }

  return (
    <div className="wrap">
      <header className="bar">
        <span className="brand">SayIt</span>
        <div className="seg" role="tablist" aria-label="Practice mode">
          <button role="tab" aria-selected={mode === "learn"} onClick={() => pick("learn")}>Learn</button>
          <button role="tab" aria-selected={mode === "free"} onClick={() => pick("free")}>Free practice</button>
        </div>
        <span className="spacer" />
        <button className="setbtn" aria-expanded={open} aria-controls="settings-panel" onClick={() => setOpen((o) => !o)}>
          <strong>Settings</strong>
          <span className="sum">{ready ? summary(s) : ""}</span>
        </button>
      </header>

      {ready && !s.onboarded && <Onboarding initial={s} onDone={(next) => { setS(next); saveSettings(next); }} />}
      {open && <SettingsPanel s={s} set={update} onClose={() => setOpen(false)} />}

      {mode === "learn" ? (
        <Learn s={s} history={history} onHistory={addHistory} />
      ) : (
        <FreePractice s={s} onHistory={addHistory} />
      )}
    </div>
  );
}
