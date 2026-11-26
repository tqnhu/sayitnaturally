import { check, clientKey, RULES, type Store } from "../lib/ratelimit-core.ts";

let bad = 0;
const ok = (name: string, v: boolean) => {
  console.log(`${v ? "ok  " : "FAIL"} ${name}`);
  if (!v) bad++;
};
const mem = () => {
  const m = new Map<string, number>();
  const s: Store = { get: async (k) => m.get(k) ?? null, set: async (k, v) => void m.set(k, v) };
  return s;
};

const t0 = 1_800_000_000_000;
const s = mem();
let allowed = 0;
for (let i = 0; i < 8; i++) if ((await check(s, "1.2.3.4", RULES, t0)).ok) allowed++;
ok("allows 8 requests in a minute", allowed === 8);
const ninth = await check(s, "1.2.3.4", RULES, t0 + 1000);
ok("blocks the 9th", !ninth.ok && ninth.rule === "minute");
ok("reports a retry time within the minute", !ninth.ok && ninth.retryAfter >= 1 && ninth.retryAfter <= 60);
ok("another client is unaffected", (await check(s, "5.6.7.8", RULES, t0 + 1000)).ok);
ok("allowed again in the next minute", (await check(s, "1.2.3.4", RULES, t0 + 61_000)).ok);

const s2 = mem();
let n = 0;
for (let i = 0; i < 45; i++) if ((await check(s2, "9.9.9.9", RULES, t0 + i * 70_000)).ok) n++;
ok("hourly cap of 40 stops a patient client", n === 40);

const s3 = mem();
const tiny = [{ name: "global-hour", limit: 3, windowSec: 3600, perClient: false }];
let g = 0;
for (let i = 0; i < 6; i++) if ((await check(s3, `ip${i}`, tiny, t0)).ok) g++;
ok("global cap applies across clients", g === 3);

ok("reads x-real-ip", clientKey(new Headers({ "x-real-ip": "8.8.8.8" })) === "8.8.8.8");
ok("falls back to x-forwarded-for", clientKey(new Headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" })) === "1.1.1.1");
ok("falls back to unknown", clientKey(new Headers()) === "unknown");
process.exit(bad ? 1 : 0);
