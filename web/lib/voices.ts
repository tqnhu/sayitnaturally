// Choosing a text-to-speech voice from the ones the browser offers. Pure logic.
export type VoiceInfo = { name: string; lang: string; localService?: boolean; default?: boolean };

const norm = (l: string) => l.replace("_", "-").toLowerCase();

/** Higher is better. Prefers the exact accent, then neural/natural/enhanced voices, and avoids robotic ones. */
export function scoreVoice(v: VoiceInfo, lang: string): number {
  const want = norm(lang);
  const have = norm(v.lang);
  let s = 0;
  if (have === want) s += 50;
  else if (have.split("-")[0] === want.split("-")[0]) s += 20;
  else return -1000; // other language: never offered
  if (/natural|neural|online/i.test(v.name)) s += 40;
  if (/premium|enhanced|siri/i.test(v.name)) s += 35;
  if (/google/i.test(v.name)) s += 20;
  if (/\b(samantha|ava|allison|aria|jenny|guy|emma|zoe|serena|daniel|karen|moira)\b/i.test(v.name)) s += 10;
  if (/espeak|compact|robot|novelty|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|pipe organ|trinoids|whisper|zarvox/i.test(v.name)) s -= 80;
  if (v.default) s += 1;
  return s;
}

/** Voices for a language, best first. */
export function listVoices<T extends VoiceInfo>(voices: T[], lang: string): T[] {
  return voices
    .map((v) => ({ v, s: scoreVoice(v, lang) }))
    .filter((x) => x.s > -1000)
    .sort((a, b) => b.s - a.s || a.v.name.localeCompare(b.v.name))
    .map((x) => x.v);
}

/** The voice to use: the learner's choice if it is still available, otherwise the best-scoring one. */
export function pickVoice<T extends VoiceInfo>(voices: T[], lang: string, preferred = ""): T | undefined {
  const ok = listVoices(voices, lang);
  return ok.find((v) => preferred && v.name === preferred) ?? ok[0];
}
