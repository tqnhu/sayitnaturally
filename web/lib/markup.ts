// Mark-up format: the same idea as app/index.html (stress, main stress, linking, tone), as objects.
export type Tone = "fall" | "rise" | "level";
export type MWord = { word: string; stress: string; main: boolean; link: boolean };
export type Phrase = { w: MWord[]; tone: Tone };
export type Markup = {
  paras: { phrases: Phrase[] }[];
  tricky: { word: string; say: string; tip: string }[];
  focus: string[];
};

/**
 * Compact notation used for the built-in texts:
 *   [x] stressed part, {x} main stress of the phrase, `_` links a word to the next one.
 *   "a[bout]_to [grab]_a {cof}fee"
 */
export function parsePhrase(src: string, tone: Tone): Phrase {
  const w: MWord[] = [];
  for (const token of src.split(/\s+/).filter(Boolean)) {
    const parts = token.split("_").filter(Boolean);
    parts.forEach((part, i) => {
      const main = /\{([^}]*)\}/.exec(part);
      const st = /\[([^\]]*)\]/.exec(part);
      const word = part.replace(/[{}[\]]/g, "");
      w.push({ word, stress: (main?.[1] ?? st?.[1]) || "", main: !!main, link: i < parts.length - 1 });
    });
  }
  return { w, tone };
}

export function fromNotation(
  paras: [string, Tone][][],
  tricky: Markup["tricky"],
  focus: string[],
): Markup {
  return {
    paras: paras.map((p) => ({ phrases: p.map(([s, t]) => parsePhrase(s, t)) })),
    tricky,
    focus,
  };
}

export const paraWords = (p: { phrases: Phrase[] }): string[] => p.phrases.flatMap((ph) => ph.w.map((x) => x.word));
export const paraText = (p: { phrases: Phrase[] }): string => paraWords(p).join(" ");

/** Split a word into the part before, inside and after its stressed letters. */
export function splitStress(w: MWord): [string, string, string] {
  if (!w.stress) return [w.word, "", ""];
  const i = w.word.toLowerCase().indexOf(w.stress.toLowerCase());
  if (i < 0) return [w.word, "", ""];
  return [w.word.slice(0, i), w.word.slice(i, i + w.stress.length), w.word.slice(i + w.stress.length)];
}

/** Mark-up without Claude: phrases split at punctuation, tone guessed from the closing mark. */
export function plainMarkup(text: string): Markup {
  const paras = text
    .split(/\n\s*\n/)
    .map((block) => {
      const phrases: Phrase[] = [];
      for (const m of block.replace(/\s+/g, " ").trim().matchAll(/([^,;:.!?]+)([,;:.!?]*)/g)) {
        const words = m[1].trim().split(" ").filter(Boolean);
        if (!words.length) continue;
        const end = m[2].slice(-1);
        phrases.push({
          w: words.map((word) => ({ word: word.replace(/^["'(]+|["')]+$/g, ""), stress: "", main: false, link: false })),
          tone: end === "?" ? "rise" : end === "," ? "level" : "fall",
        });
      }
      return { phrases };
    })
    .filter((p) => p.phrases.length);
  return { paras, tricky: [], focus: [] };
}
