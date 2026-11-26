// Word-level scoring ported from app/index.html (norm, align, evaluate).
export const norm = (s: string): string[] =>
  s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{N}' ]+/gu, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^'+|'+$/g, ""))
    .filter(Boolean);

export type AlignOp = { t: number; s?: string; k: "ok" | "sub" | "miss" };

export function align(a: string[], b: string[]): AlignOp[] {
  const n = a.length;
  const m = b.length;
  const D = Array.from({ length: n + 1 }, (_, i) => {
    const r = new Array<number>(m + 1).fill(0);
    r[0] = i;
    return r;
  });
  for (let j = 0; j <= m; j++) D[0][j] = j;
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  const out: AlignOp[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && D[i][j] === D[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) {
      out.push({ t: i - 1, s: b[j - 1], k: a[i - 1] === b[j - 1] ? "ok" : "sub" });
      i--;
      j--;
    } else if (i > 0 && D[i][j] === D[i - 1][j] + 1) {
      out.push({ t: i - 1, k: "miss" });
      i--;
    } else {
      j--;
    }
  }
  return out.reverse();
}

export type WordResult = { word: string; k: "ok" | "sub" | "miss"; heard: string[] };
export type SpeechScore = { words: WordResult[]; pct: number; said: string };

/** Compare the words of the target text with what the recogniser heard. Returns null if nothing was heard. */
export function scoreSpeech(targetWords: string[], heard: string): SpeechScore | null {
  const said = norm(heard);
  if (!said.length) return null;
  const tNorm = targetWords.map((w) => norm(w).join(" "));
  const tFlat: string[] = [];
  const map: number[] = [];
  tNorm.forEach((w, i) =>
    w.split(" ").filter(Boolean).forEach((x) => {
      tFlat.push(x);
      map.push(i);
    }),
  );
  const al = align(tFlat, said);
  const per: WordResult[] = targetWords.map((word) => ({ word, k: "ok", heard: [] }));
  for (const o of al) {
    const i = map[o.t];
    if (o.k !== "ok" && per[i].k === "ok") per[i].k = o.k;
    if (o.s && o.k !== "ok") per[i].heard.push(o.s);
  }
  const ok = al.filter((o) => o.k === "ok").length;
  return { words: per, pct: Math.round((100 * ok) / Math.max(1, tFlat.length)), said: said.join(" ") };
}
