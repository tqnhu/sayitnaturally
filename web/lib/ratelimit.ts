import { getCache } from "@vercel/functions";
import { check, clientKey, type Store } from "./ratelimit-core.ts";

// Counts live in two places: Vercel's Runtime Cache (shared by instances in a region, so limits hold across
// requests) and an in-memory map (so limits also work locally and if the cache is unavailable).
// Counting is approximate: reads and writes are not atomic, which is fine for abuse protection.
const mem = new Map<string, { v: number; exp: number }>();

const store: Store = {
  async get(key) {
    const m = mem.get(key);
    const local = m && m.exp > Date.now() ? m.v : 0;
    let shared = 0;
    try {
      const v = await getCache().get(key);
      if (typeof v === "number") shared = v;
    } catch {
      /* cache unavailable: use the in-memory count */
    }
    return Math.max(local, shared) || null;
  },
  async set(key, value, ttlSec) {
    mem.set(key, { v: value, exp: Date.now() + ttlSec * 1000 });
    if (mem.size > 5000) for (const [k, e] of mem) if (e.exp < Date.now()) mem.delete(k);
    try {
      await getCache().set(key, value, { ttl: ttlSec, name: "rate-limit" });
    } catch {
      /* ignore */
    }
  },
};

/** Returns a 429 Response when the caller is over a limit, otherwise null. */
export async function rateLimit(req: Request): Promise<Response | null> {
  const v = await check(store, clientKey(req.headers));
  if (v.ok) return null;
  return Response.json(
    { error: "Too many requests. Please wait a moment and try again." },
    { status: 429, headers: { "Retry-After": String(v.retryAfter) } },
  );
}
