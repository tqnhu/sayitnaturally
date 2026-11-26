import { listVoices, pickVoice, scoreVoice } from "../lib/voices.ts";

let bad = 0;
const ok = (n: string, v: boolean) => {
  console.log(`${v ? "ok  " : "FAIL"} ${n}`);
  if (!v) bad++;
};
const voices = [
  { name: "eSpeak English", lang: "en-US" },
  { name: "Google US English", lang: "en-US" },
  { name: "Microsoft Aria Online (Natural) - English (United States)", lang: "en-US" },
  { name: "Samantha", lang: "en_US" },
  { name: "Daniel", lang: "en-GB" },
  { name: "Amelie", lang: "fr-CA" },
  { name: "Zarvox", lang: "en-US" },
];
const best = listVoices(voices, "en-US");
ok("natural voice ranks first", best[0].name.includes("Natural"));
ok("robotic voices rank last", /eSpeak|Zarvox/.test(best[best.length - 1].name));
ok("other languages are not offered", !best.some((v) => v.name === "Amelie"));
ok("other regions are offered after exact matches", best.some((v) => v.name === "Daniel") && best.findIndex((v) => v.name === "Daniel") > best.findIndex((v) => v.name === "Google US English"));
ok("underscore language codes match", scoreVoice({ name: "Samantha", lang: "en_US" }, "en-US") >= 50);
ok("keeps the learner's choice", pickVoice(voices, "en-US", "Google US English")?.name === "Google US English");
ok("falls back when the choice is gone", pickVoice(voices, "en-US", "Missing")?.name.includes("Natural") === true);
ok("returns undefined when no voice fits", pickVoice(voices, "de-DE") === undefined);
process.exit(bad ? 1 : 0);
