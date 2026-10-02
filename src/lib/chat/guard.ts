import { createHash } from "node:crypto";

import { CHAT } from "./config";
import type { Store } from "./store";

export type Denial = "quota" | "busy" | "visitor-burst" | "visitor-daily";

/* ------------------------------------------------------------------ */
/*  Who is asking                                                     */
/* ------------------------------------------------------------------ */

/**
 * A stable, non-reversible key for the visitor's network.
 *
 * IPv6 is bucketed to its /64: a single connection is routinely handed a
 * whole /64, so rotating through it must not mint fresh limits. The address
 * is hashed so raw IPs are never written to the store.
 */
export function visitorKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = request.headers.get("x-real-ip") ?? forwarded ?? "unknown";

  const network = ip.includes(":")
    ? ip.split(":").slice(0, 4).join(":") + "::/64"
    : ip;

  return createHash("sha256").update(network).digest("hex").slice(0, 24);
}

/**
 * Only this site's own pages may call the assistant.
 *
 * Browsers attach Origin and Sec-Fetch-Site to every POST and pages can't
 * forge them, so this stops other sites from embedding the assistant on our
 * quota. A script can forge both — that is what BotID and the daily cap are for.
 */
export function isSameSite(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") return false;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (originHost === host) return true;

  const extra = (process.env.CHAT_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return extra.some((allowed) => {
    try {
      return new URL(allowed).host === originHost;
    } catch {
      return false;
    }
  });
}

/* ------------------------------------------------------------------ */
/*  Limits                                                            */
/* ------------------------------------------------------------------ */

const today = () => new Date().toISOString().slice(0, 10);

const DAY = 24 * 60 * 60;

const keys = {
  callsToday: () => `chat:calls:${today()}`,
  globalMinute: () => `chat:global:${Math.floor(Date.now() / 60_000)}`,
  burst: (visitor: string) =>
    `chat:v:${visitor}:b:${Math.floor(Date.now() / (CHAT.perVisitor.burst.windowSeconds * 1000))}`,
  daily: (visitor: string) => `chat:v:${visitor}:d:${today()}`,
  leads: (visitor: string) => `chat:v:${visitor}:leads:${today()}`,
};

/**
 * Admit one message, or say which limit stopped it.
 *
 * The daily cap is checked first and only read, so a visitor turned away
 * for quota doesn't also burn their own allowance.
 */
export async function admit(store: Store, visitor: string): Promise<Denial | null> {
  if ((await store.get(keys.callsToday())) >= CHAT.globalPerDay) return "quota";

  const [global, burst, daily] = await Promise.all([
    store.incr(keys.globalMinute(), 1, 120),
    store.incr(keys.burst(visitor), 1, CHAT.perVisitor.burst.windowSeconds),
    store.incr(keys.daily(visitor), 1, DAY),
  ]);

  if (global > CHAT.globalPerMinute) return "busy";
  if (burst > CHAT.perVisitor.burst.limit) return "visitor-burst";
  if (daily > CHAT.perVisitor.daily.limit) return "visitor-daily";
  return null;
}

/** Count one model call against the site-wide daily cap. */
export async function recordCall(store: Store) {
  await store.incr(keys.callsToday(), 1, 2 * DAY);
}

/** Leads are capped per visitor so the lead list can't be flooded. */
export async function admitLead(store: Store, visitor: string) {
  const count = await store.incr(keys.leads(visitor), 1, DAY);
  return count <= CHAT.perVisitor.leadsPerDay;
}
