// Sanity test on a synthetic "speech-like" signal: ~4.5 syllables/s of a 120 Hz voice with a falling
// pitch contour per phrase, and a 0.6 s pause between phrases. Run: npm test
import { analyse, SR } from "../lib/analysis.ts";

const secs = 12;
const N = secs * SR;
const x = new Float32Array(N);
const phraseLen = 2.4; // seconds of speech, then 0.6 s silence
let phase = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const inPhrase = t % (phraseLen + 0.6);
  if (inPhrase > phraseLen) continue;
  const syl = 0.5 + 0.5 * Math.sin(2 * Math.PI * 4.5 * t); // syllable envelope
  const f0 = 140 - 30 * (inPhrase / phraseLen); // falling contour
  phase += (2 * Math.PI * f0) / SR;
  let v = 0;
  for (let h = 1; h <= 6; h++) v += Math.sin(h * phase) / h;
  x[i] = 0.3 * syl * v;
}
// crude 1 kHz band-pass by differencing a low-passed copy (good enough for syllable timing here)
const y = new Float32Array(N);
let lp = 0;
for (let i = 0; i < N; i++) {
  lp += 0.4 * (x[i] - lp);
  y[i] = x[i] - lp;
}

const a = analyse(x, y, secs);
const checks: [string, boolean][] = [
  ["found 3-4 phrases with pauses", a.pauses.length >= 3 && a.pauses.length <= 4],
  ["pitch range is not octave-inflated (< 12 st)", a.range < 12],
  ["median pitch near 125 Hz", a.f0 > 100 && a.f0 < 150],
  ["phrases counted as falling", (a.falling ?? 0) >= 50],
];
let bad = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}`);
  if (!ok) bad++;
}
console.log(JSON.stringify({ rate: a.rate, artic: a.artic, range: a.range, f0: a.f0, falling: a.falling, pauses: a.pauses.length }));
process.exit(bad ? 1 : 0);
