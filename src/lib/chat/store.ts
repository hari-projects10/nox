/**
 * Shared counters for the assistant's limits.
 *
 * Serverless instances share no memory, so on Vercel every counter has to
 * live in one place — an Upstash Redis database, reached over its REST API
 * (no client library needed). Locally an in-process map stands in.
 *
 * On Vercel without Redis configured, getStore() returns null and the route
 * refuses to call the model: limits that can't be enforced across instances
 * are not limits, so the assistant fails closed rather than open.
 */

export type Store = {
  /** Increment a counter, starting its expiry on first use. Returns the new value. */
  incr(key: string, by: number, ttlSeconds: number): Promise<number>;
  get(key: string): Promise<number>;
  /** Prepend to a capped list (newest first). */
  push(key: string, value: string, keep: number): Promise<void>;
};

/* ------------------------------------------------------------------ */
/*  Upstash Redis over REST                                           */
/* ------------------------------------------------------------------ */

function redisStore(url: string, token: string): Store {
  async function pipeline(commands: (string | number)[][]) {
    const response = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Redis responded ${response.status}`);

    const results = (await response.json()) as { result?: unknown; error?: string }[];
    const failed = results.find((entry) => entry.error);
    if (failed) throw new Error(`Redis error: ${failed.error}`);
    return results.map((entry) => entry.result);
  }

  return {
    async incr(key, by, ttlSeconds) {
      const [value] = await pipeline([
        ["INCRBY", key, by],
        /* NX: the window starts on first hit and is never extended. */
        ["EXPIRE", key, ttlSeconds, "NX"],
      ]);
      return Number(value);
    },
    async get(key) {
      const [value] = await pipeline([["GET", key]]);
      return Number(value ?? 0);
    },
    async push(key, value, keep) {
      await pipeline([
        ["LPUSH", key, value],
        ["LTRIM", key, 0, keep - 1],
      ]);
    },
  };
}

/* ------------------------------------------------------------------ */
/*  In-process fallback, local development only                       */
/* ------------------------------------------------------------------ */

function memoryStore(): Store {
  const counters = new Map<string, { value: number; expires: number }>();
  const lists = new Map<string, string[]>();

  const live = (key: string) => {
    const entry = counters.get(key);
    if (entry && entry.expires <= Date.now()) counters.delete(key);
    return counters.get(key);
  };

  return {
    async incr(key, by, ttlSeconds) {
      const entry = live(key) ?? { value: 0, expires: Date.now() + ttlSeconds * 1000 };
      entry.value += by;
      counters.set(key, entry);
      return entry.value;
    },
    async get(key) {
      return live(key)?.value ?? 0;
    },
    async push(key, value, keep) {
      lists.set(key, [value, ...(lists.get(key) ?? [])].slice(0, keep));
    },
  };
}

/* ------------------------------------------------------------------ */

let cached: Store | null | undefined;

export function getStore(): Store | null {
  if (cached !== undefined) return cached;

  /* Vercel's Upstash integration prefixes these KV_ or STORAGE_ (its
     custom-prefix default); a direct Upstash database uses UPSTASH_REDIS_. */
  const env = process.env;
  const url = env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL ?? env.STORAGE_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN ?? env.STORAGE_REST_API_TOKEN;

  if (url && token) cached = redisStore(url.replace(/\/$/, ""), token);
  else if (process.env.VERCEL) cached = null;
  else cached = memoryStore();

  return cached;
}
