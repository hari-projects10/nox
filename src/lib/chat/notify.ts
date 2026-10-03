import { site } from "@/lib/site";

import type { Lead } from "./prompt";

/**
 * Emails the team the moment the assistant saves a lead, through Resend's
 * REST API (no SDK needed for one call).
 *
 * Optional: without RESEND_API_KEY and LEAD_ALERT_EMAIL it does nothing, and
 * it never throws — a failed alert must not cost the visitor their reply.
 * The lead is already safe in Redis either way.
 */
export async function notifyLead(lead: Lead) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_ALERT_EMAIL;
  if (!key || !to) return;

  /* Resend's shared sender works without a verified domain, but only to the
     address the Resend account was opened with. Set LEAD_ALERT_FROM once
     the studio's own domain is verified. */
  const from = process.env.LEAD_ALERT_FROM ?? `${site.name} Leads <onboarding@resend.dev>`;
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.contact);
  const oneLine = (text: string) => text.replace(/\s+/g, " ").trim();

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        subject: oneLine(`New lead: ${lead.name}`),
        /* Replying goes straight to the visitor when they left an email. */
        ...(isEmail && { reply_to: lead.contact }),
        text: [
          `${lead.name} left their details with the ${site.name} assistant.`,
          "",
          `Contact: ${lead.contact}`,
          `Project: ${lead.project}`,
          "",
          `Saved ${new Date().toUTCString()}.`,
        ].join("\n"),
      }),
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error(`[chat] Lead alert failed: ${response.status} ${await response.text()}`);
    }
  } catch (error) {
    console.error("[chat] Lead alert failed", error);
  }
}
