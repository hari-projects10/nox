/**
 * Every limit the site assistant runs under, in one place.
 *
 * It runs on Gemini's free tier, so abuse can't cost money, only use up the
 * day's free quota. The layers below keep that quota for real visitors:
 *
 *   1. BotID           scripts and headless browsers never reach the model
 *   2. Origin check    only pages served by this site may call the route
 *   3. Per-visitor     an IP (an IPv6 /64) gets a real conversation, not more
 *   4. Site-wide burst a swarm of fresh IPs is throttled together
 *   5. Daily cap       a hard ceiling on model calls per day across everyone,
 *                      the one layer no number of devices or logins gets around
 *   6. Topic lock      off-topic requests are declined, so the assistant is
 *                      worthless as a free general-purpose chatbot
 *
 * When any limit or the free quota runs out, visitors are pointed to email.
 */

const num = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const CHAT = {
  /**
   * Small, fast models: enough for questions, booking and contact, and the
   * free quota goes furthest. The backup takes over when the first is
   * overloaded or out of quota.
   */
  models: ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"],

  /** Short answers. */
  maxOutputTokens: 500,

  /** Bounds on what a visitor can send, enforced server-side. */
  input: {
    maxMessageChars: 600,
    /** Older turns are dropped, so a long chat can't inflate every call. */
    maxHistoryMessages: 12,
    maxHistoryChars: 6000,
    maxBodyBytes: 48_000,
  },

  /**
   * Per visitor. Sized so a genuine enquiry — a dozen or two questions —
   * never trips them, while one machine can't drain the day's quota.
   */
  perVisitor: {
    burst: { limit: 12, windowSeconds: 5 * 60 },
    daily: { limit: 50, windowSeconds: 24 * 60 * 60 },
    leadsPerDay: 3,
  },

  /** Site-wide messages per minute, kept under the free tier's rate limit. */
  globalPerMinute: num(process.env.CHAT_GLOBAL_PER_MINUTE, 15),

  /** Site-wide model calls per day, kept under the free tier's daily quota. */
  globalPerDay: num(process.env.CHAT_DAILY_LIMIT, 500),

  /** Model calls per reply: one lead save, then the confirmation. */
  maxModelCalls: 2,
} as const;
