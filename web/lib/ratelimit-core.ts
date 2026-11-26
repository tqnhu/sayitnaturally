// Fixed-window rate limiting on top of a tiny key-value store. Pure logic, so it is easy to test.
export type Store = {
  get(key: string): Promise<number | null>;
  set(key: string, value: number, ttlSec: number): Promise<void>;
};

export type Rule = { name: string; limit: number; windowSec: number; perClient: boolean };

// Limits for the AI routes (/api/coach, /api/markup). Each call costs AI Gateway credits.
export const RULES: Rule[] = [
  { name: "minute", limit: 8, windowSec: 60, perClient: true },
  { name: "hour", limit: 40, windowSec: 3600, perClient: true },
  { name: "global-hour", limit: 400, windowSec: 3600, perClient: false },
];

export type Verdict = { ok: true } | { ok: false; retryAfter: number; rule: string };

export async function check(store: Store, client: string, rules: Rule[] = RULES, now = Date.now()): Promise<Verdict> {
  const keyed = rules.map((r) => {
    const win = Math.floor(now / 1000 / r.windowSec);
    return { r, key: `rl:${r.name}:${r.perClient ? client : "all"}:${win}`, retryAfter: (win + 1) * r.windowSec - Math.floor(now / 1000) };
  });
  const counts = await Promise.all(keyed.map((k) => store.get(k.key)));
  for (let i = 0; i < keyed.length; i++) {
    if ((counts[i] ?? 0) >= keyed[i].r.limit) return { ok: false, retryAfter: Math.max(1, keyed[i].retryAfter), rule: keyed[i].r.name };
  }
  await Promise.all(keyed.map((k, i) => store.set(k.key, (counts[i] ?? 0) + 1, k.r.windowSec)));
  return { ok: true };
}

/** Best-effort client address from the platform's forwarding headers. */
export function clientKey(headers: Headers): string {
  const ip = headers.get("x-real-ip") || headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return ip ? ip.slice(0, 64) : "unknown";
}
