import { listVoices, pickVoice } from "./voices.ts";

// Thin wrapper over the browser's speech recognition (Chrome, Edge, Safari). No audio leaves the page
// through our code; the browser may send it to its own speech service.
type RecEvent = { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> };
type Rec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: RecEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecCtor = new () => Rec;

export const recognitionSupported = (): boolean =>
  typeof window !== "undefined" &&
  !!((window as unknown as { SpeechRecognition?: RecCtor }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: RecCtor }).webkitSpeechRecognition);

export type RunState = { finals: string[]; partial: string; t0: number; last: number; gaps: number };

export function startRecognition(
  lang: string,
  onUpdate: (s: RunState) => void,
  onEnd: (s: RunState, error: string | null) => void,
): { stop: () => void } {
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) {
    onEnd({ finals: [], partial: "", t0: 0, last: 0, gaps: 0 }, "unsupported");
    return { stop() {} };
  }
  const rec = new Ctor();
  rec.lang = lang;
  rec.continuous = true;
  rec.interimResults = true;
  const s: RunState = { finals: [], partial: "", t0: 0, last: 0, gaps: 0 };
  let error: string | null = null;
  rec.onresult = (e) => {
    const now = performance.now();
    if (!s.t0) s.t0 = now;
    if (s.last && now - s.last > 700) s.gaps++;
    s.last = now;
    let partial = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) s.finals.push(r[0].transcript);
      else partial += r[0].transcript;
    }
    s.partial = partial;
    onUpdate({ ...s, finals: [...s.finals] });
  };
  rec.onerror = (e) => {
    error = e.error;
  };
  rec.onend = () => onEnd({ ...s, finals: [...s.finals] }, error);
  rec.start();
  return { stop: () => rec.stop() };
}

export function speak(text: string, lang: string, rate = 1, voiceName = ""): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  const v = pickVoice(synth.getVoices(), lang, voiceName);
  if (v) u.voice = v;
  synth.speak(u);
}

/** Voices installed for a language, best first. Empty until the browser has loaded its voice list. */
export function voicesFor(lang: string): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return listVoices(window.speechSynthesis.getVoices(), lang);
}
