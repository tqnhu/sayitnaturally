// Prosody analysis, ported from app/index.html `analyse()` (see docs/ARCHITECTURE.md).
// Pure function: it takes audio already resampled to 8 kHz mono, so it runs in the browser and in Node.

export const SR = 8000;

export type Analysis = {
  dur: number;
  rate: number;
  artic: number;
  speakShare: number;
  group: number;
  pausesPerMin: number;
  longPauses: string[];
  f0: number;
  range: number;
  falling: number | null;
  rise: number;
  fall: number;
  lev: number;
  /** pitch track in semitones around the median, one value per 20 ms (NaN = unvoiced) */
  st: number[];
  /** speech runs as [startFrame, endFrame] at 10 ms per frame */
  runs: [number, number][];
  /** total frames (10 ms each) */
  frames: number;
  pauses: { at: number; len: number }[];
};

export class AnalysisError extends Error {
  code: "silent" | "pitch";
  constructor(code: "silent" | "pitch") {
    super(code);
    this.code = code;
  }
}

const pct = (a: ArrayLike<number>, p: number) => {
  const s = Array.from(a).sort((x, y) => x - y);
  return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0;
};

export const fmtTime = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * @param x  mono audio at 8 kHz
 * @param y  the same audio through a 1 kHz band-pass (Q 0.6), used for syllable detection
 * @param duration length of the recording in seconds
 */
export function analyse(x: Float32Array, y: Float32Array, duration: number): Analysis {
  const N = x.length;
  const hop = 80;
  const win = 200;
  const F = Math.floor((N - win) / hop);
  if (F < 30) throw new AnalysisError("silent");
  const db = new Float32Array(F);
  const eb = new Float32Array(F);
  for (let f = 0; f < F; f++) {
    let a = 0;
    let b = 0;
    const o = f * hop;
    for (let i = 0; i < win; i++) {
      a += x[o + i] ** 2;
      b += y[o + i] ** 2;
    }
    db[f] = 10 * Math.log10(a / win + 1e-12);
    eb[f] = 10 * Math.log10(b / win + 1e-12);
  }
  const fl = pct(db, 0.1);
  const pk = pct(db, 0.95);
  const th = fl + 0.2 * (pk - fl);
  let sp: boolean[] = Array.from(db, (v) => v > th);
  const runs = () => {
    const r: [number, number][] = [];
    let s = -1;
    for (let f = 0; f <= F; f++) {
      const v = f < F && sp[f];
      if (v && s < 0) s = f;
      if (!v && s >= 0) {
        r.push([s, f]);
        s = -1;
      }
    }
    return r;
  };
  let R = runs();
  for (let k = 1; k < R.length; k++)
    if (R[k][0] - R[k - 1][1] < 15) for (let f = R[k - 1][1]; f < R[k][0]; f++) sp[f] = true;
  R = runs().filter((r) => r[1] - r[0] >= 8);
  sp = new Array(F).fill(false);
  R.forEach(([a, b]) => {
    for (let f = a; f < b; f++) sp[f] = true;
  });
  if (!R.length) throw new AnalysisError("silent");

  const active = (R[R.length - 1][1] - R[0][0]) / 100;
  const speech = R.reduce((s, [a, b]) => s + b - a, 0) / 100;
  const gaps: { at: number; len: number }[] = [];
  for (let k = 1; k < R.length; k++) gaps.push({ at: R[k - 1][1] / 100, len: (R[k][0] - R[k - 1][1]) / 100 });
  const pauses = gaps.filter((g) => g.len >= 0.3);

  // breath groups: split at gaps of 300 ms or more
  const groupSpans: [number, number][] = [];
  {
    let s = R[0][0];
    for (let k = 1; k <= R.length; k++) {
      if (k === R.length || R[k][0] - R[k - 1][1] >= 30) {
        groupSpans.push([s, R[k - 1][1]]);
        if (k < R.length) s = R[k][0];
      }
    }
  }

  // syllables: local maxima of the smoothed band-passed loudness
  const sm = Float32Array.from(eb, (_, i) => {
    let s = 0;
    let c = 0;
    for (let j = -2; j <= 2; j++) {
      const q = eb[i + j];
      if (q !== undefined) {
        s += q;
        c++;
      }
    }
    return s / c;
  });
  let syl = 0;
  let lastP = -99;
  for (let f = 12; f < F - 12; f++) {
    if (!sp[f]) continue;
    let mx = true;
    let mnL = sm[f];
    let mnR = sm[f];
    for (let j = 1; j <= 4; j++) {
      if (sm[f - j] > sm[f] || sm[f + j] >= sm[f]) {
        mx = false;
        break;
      }
    }
    if (!mx) continue;
    for (let j = 1; j <= 12; j++) {
      mnL = Math.min(mnL, sm[f - j]);
      mnR = Math.min(mnR, sm[f + j]);
    }
    if (sm[f] - Math.max(mnL, mnR) >= 2.5 && f - lastP >= 8) {
      syl++;
      lastP = f;
    }
  }

  // pitch: normalised autocorrelation, 40 ms frames every 20 ms, 70-400 Hz
  const W = 320;
  const f0: number[] = [];
  for (let f = 0; f < F; f += 2) {
    if (!sp[f] || f * hop + W + 120 > N) {
      f0.push(NaN);
      continue;
    }
    const o = f * hop;
    let best = 0;
    let bk = 0;
    let e0 = 0;
    for (let i = 0; i < W; i++) e0 += x[o + i] ** 2;
    if (e0 < 1e-7) {
      f0.push(NaN);
      continue;
    }
    for (let k = 20; k <= 115; k++) {
      let c = 0;
      let e1 = 0;
      for (let i = 0; i < W; i++) {
        c += x[o + i] * x[o + i + k];
        e1 += x[o + i + k] ** 2;
      }
      const r = c / Math.sqrt(e0 * e1 + 1e-12);
      if (r > best) {
        best = r;
        bk = k;
      }
    }
    f0.push(best > 0.5 ? SR / bk : NaN);
  }
  const f0m = f0.map((v, i) => {
    const w = f0.slice(Math.max(0, i - 2), i + 3).filter((q) => !isNaN(q));
    return isNaN(v) || w.length < 3 ? NaN : w.sort((a, b) => a - b)[w.length >> 1];
  });
  const voiced = f0m.filter((v) => !isNaN(v));
  if (voiced.length < 20) throw new AnalysisError("pitch");
  const med = pct(voiced, 0.5);
  // octave folding: keep every value within +-9 semitones of the median
  const st = f0m.map((v) => {
    if (isNaN(v)) return NaN;
    let q = 12 * Math.log2(v / med);
    while (q > 9) q -= 12;
    while (q < -9) q += 12;
    return q;
  });
  const stv = st.filter((v) => !isNaN(v));
  const range = pct(stv, 0.9) - pct(stv, 0.1);

  // phrase endings: compare the last ~120 ms with the first half
  let fall = 0;
  let rise = 0;
  let lev = 0;
  for (const [s, e] of groupSpans) {
    if (e - s >= 80) {
      const seg = st.slice(s >> 1, e >> 1).filter((v) => !isNaN(v));
      if (seg.length >= 15) {
        const d = pct(seg.slice(-6), 0.5) - pct(seg.slice(0, seg.length >> 1), 0.5);
        if (d < -1) fall++;
        else if (d > 1) rise++;
        else lev++;
      }
    }
  }
  const phr = fall + rise + lev;

  return {
    dur: +duration.toFixed(1),
    rate: +(syl / active).toFixed(2),
    artic: +(syl / speech).toFixed(2),
    speakShare: Math.round((100 * speech) / active),
    group: +(syl / groupSpans.length / 1.4).toFixed(1),
    pausesPerMin: +((pauses.length / active) * 60).toFixed(1),
    longPauses: pauses.filter((p) => p.len >= 1).map((p) => `${fmtTime(p.at)} (${p.len.toFixed(1)}s)`),
    f0: Math.round(med),
    range: +range.toFixed(1),
    falling: phr ? Math.round((100 * fall) / phr) : null,
    rise,
    fall,
    lev,
    st,
    runs: R,
    frames: F,
    pauses,
  };
}

/** Rough conversational norms for General American English (from drawMeters in app/index.html). */
export const METERS = [
  { key: "rate", label: "Speaking rate", unit: "syll/s", lo: 3.8, hi: 5.5, max: 7, tip: "Syllables per second including pauses. Too slow usually comes from pausing, not from slow words." },
  { key: "artic", label: "Speed while talking", unit: "syll/s", lo: 5, hi: 6.5, max: 8, tip: 'Shrink unstressed syllables to a quick "uh" to speed up without rushing.' },
  { key: "group", label: "Words per breath group", unit: "words", lo: 4, hi: 8, max: 12, tip: "How long you speak before pausing. Say whole phrases in one breath." },
  { key: "speakShare", label: "Time spent speaking", unit: "%", lo: 75, hi: 90, max: 100, tip: "The rest is silence. Pause between ideas, not between words." },
  { key: "range", label: "Pitch range", unit: "semitones", lo: 6, hi: 12, max: 16, tip: "Narrow range sounds flat. Lift your voice on the key word of each phrase.", tooHigh: "Very wide: check for sudden jumps, or keep big rises for the key word only." },
  { key: "falling", label: "Phrases ending with a fall", unit: "%", lo: 55, hi: 90, max: 100, tip: "Statements fall at the end in most languages; a flat or rising end sounds unfinished." },
] as const;
