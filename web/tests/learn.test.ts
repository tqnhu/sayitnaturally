import { parsePhrase, paraText, plainMarkup, splitStress } from "../lib/markup.ts";
import { scoreSpeech } from "../lib/score.ts";

let bad = 0;
const check = (name: string, ok: boolean) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}`);
  if (!ok) bad++;
};

const ph = parsePhrase("I was [just] a[bout]_to [grab]_a {cof}fee", "fall");
check("parses words", ph.w.map((w) => w.word).join(" ") === "I was just about to grab a coffee");
check("marks the main stress", ph.w[ph.w.length - 1].main && ph.w[ph.w.length - 1].stress === "cof");
check("marks links", ph.w[3].link && !ph.w[4].link);
check("splits a stressed word", splitStress(ph.w[3]).join("|") === "a|bout|");
check("paraText joins words", paraText({ phrases: [ph] }) === "I was just about to grab a coffee");

const pm = plainMarkup("Hey, how's it going?\n\nFine. Thanks!");
check("plain mark-up has two paragraphs", pm.paras.length === 2);
check("plain mark-up guesses tone", pm.paras[0].phrases[1].tone === "rise" && pm.paras[1].phrases[0].tone === "fall");

const target = "Hey how's it going".split(" ");
const s = scoreSpeech(target, "hey house it going");
check("scores substitutions", s !== null && s.pct === 75 && s.words[1].k === "sub" && s.words[1].heard[0] === "house");
const m = scoreSpeech(target, "hey it going");
check("scores missing words", m !== null && m.words[1].k === "miss");
check("returns null when nothing heard", scoreSpeech(target, "  ") === null);
check("handles hyphens and punctuation", scoreSpeech(["high-pressure,", "world."], "high pressure world")?.pct === 100);

process.exit(bad ? 1 : 0);
