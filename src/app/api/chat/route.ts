import { checkBotId } from "botid/server";

import { CHAT } from "@/lib/chat/config";
import { answerFromFaq, streamPrepared } from "@/lib/chat/faq";
import { openStream, readStream, type GeminiContent, type GeminiPart } from "@/lib/chat/gemini";
import { admit, admitLead, isSameSite, recordCall, visitorKey, type Denial } from "@/lib/chat/guard";
import { parseLead, SAVE_LEAD_TOOL, SYSTEM_PROMPT } from "@/lib/chat/prompt";
import { notifyLead } from "@/lib/chat/notify";
import { getStore } from "@/lib/chat/store";
import { site } from "@/lib/site";

export const maxDuration = 30;

const EMAIL = site.contact.email;

/**
 * Every refusal still leaves a real client somewhere to go. Limits exist to
 * stop abuse; a genuine enquiry that happens to hit one is handed to email.
 */
const NOTICES: Record<Denial | "unavailable" | "too-long" | "error", string> = {
  quota: `Our assistant is resting for now. Email us at ${EMAIL} and the team will reply personally.`,
  busy: `Lots of conversations at the moment. Try again in a minute, or email us at ${EMAIL}.`,
  "visitor-burst": `Let's take a short breather. You can continue in a few minutes, or email us at ${EMAIL} to talk with the team directly.`,
  "visitor-daily": `You've reached today's chat limit. The team would love to hear the rest. Email us at ${EMAIL}.`,
  unavailable: `The assistant is offline right now. Email us at ${EMAIL} and we'll get back to you.`,
  "too-long": `That message is a little long for chat. Could you shorten it, or send the details to ${EMAIL}?`,
  error: `Something went wrong on our side. Please try again, or email us at ${EMAIL}.`,
};

const notice = (key: keyof typeof NOTICES, status: number) =>
  Response.json({ notice: NOTICES[key] }, { status });

const STREAM_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

type ChatTurn = { role: "user" | "assistant"; content: string };

/**
 * Accept only plain text turns, newest last. Returns the whole conversation
 * (for picking unused prepared answers) and the window sent to the model.
 */
function readHistory(body: unknown): { all: ChatTurn[]; recent: ChatTurn[] } | "too-long" | null {
  if (!body || typeof body !== "object") return null;
  const raw = (body as { messages?: unknown }).messages;
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const turns: ChatTurn[] = [];
  for (const entry of raw.slice(-50)) {
    if (!entry || typeof entry !== "object") return null;
    const { role, content } = entry as Record<string, unknown>;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    turns.push({ role, content: content.slice(0, 2000) });
  }

  const last = turns.at(-1);
  if (!last || last.role !== "user" || !last.content.trim()) return null;
  if (last.content.length > CHAT.input.maxMessageChars) return "too-long";

  /* Keep the newest turns that fit, then make sure the window opens on a
     user turn, as the API requires. */
  const kept: ChatTurn[] = [];
  let chars = 0;
  for (const turn of turns.slice(-CHAT.input.maxHistoryMessages).reverse()) {
    chars += turn.content.length;
    if (chars > CHAT.input.maxHistoryChars && kept.length > 0) break;
    kept.unshift(turn);
  }
  while (kept[0]?.role === "assistant") kept.shift();

  return kept.length ? { all: turns, recent: kept } : null;
}

export async function POST(request: Request) {
  /* Cheapest checks first: nothing below costs a model call until every
     gate has passed. */
  if (!isSameSite(request)) return notice("unavailable", 403);

  /* Off Vercel (local runs) there is nothing to verify against. On Vercel a
     failing check is logged and skipped, not fatal: the per-visitor limits
     and daily cap below still hold, and the assistant stays up. */
  let isBot = false;
  try {
    const verification = await checkBotId({
      developmentOptions: { isDevelopment: !process.env.VERCEL },
    });
    isBot = verification.isBot;
  } catch (error) {
    console.error("[chat] BotID check failed; continuing on the other limits", error);
  }
  if (isBot) return notice("unavailable", 403);

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > CHAT.input.maxBodyBytes) return notice("too-long", 413);
  const text = await request.text();
  if (text.length > CHAT.input.maxBodyBytes) return notice("too-long", 413);

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return notice("error", 400);
  }
  const conversation = readHistory(body);
  if (conversation === "too-long") return notice("too-long", 400);
  if (!conversation) return notice("error", 400);
  const history = conversation.recent;

  /* Common questions get a prepared answer: no model call, no quota, and
     no limit counted against the visitor. */
  const prepared = answerFromFaq(conversation.all);
  if (prepared) {
    return new Response(streamPrepared(prepared, request.signal), { headers: STREAM_HEADERS });
  }

  const store = getStore();
  if (!store || !process.env.GEMINI_API_KEY) {
    console.error("[chat] Not configured: needs GEMINI_API_KEY and, on Vercel, Upstash Redis.");
    return notice("unavailable", 503);
  }

  const visitor = visitorKey(request);
  let denial: Denial | null;
  try {
    denial = await admit(store, visitor);
  } catch (error) {
    /* If the limits can't be checked, don't spend. */
    console.error("[chat] Limit store failed", error);
    return notice("unavailable", 503);
  }
  if (denial) return notice(denial, 429);

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      /* A lead's contact must appear in what the visitor typed. */
      const visitorText = history
        .filter((turn) => turn.role === "user")
        .map((turn) => turn.content)
        .join("\n");
      const contents: GeminiContent[] = history.map((turn) => ({
        role: turn.role === "assistant" ? "model" : "user",
        parts: [{ text: turn.content }],
      }));
      let wrote = false;

      try {
        for (let call = 0; call < CHAT.maxModelCalls; call++) {
          await recordCall(store);
          const response = await openStream(
            {
              systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
              contents,
              tools: [{ functionDeclarations: [SAVE_LEAD_TOOL] }],
            },
            request.signal,
          );

          let opening = true;
          const parts = await readStream(response, (delta) => {
            /* Separate the text before a tool call from the text after it. */
            if (opening && wrote) controller.enqueue(encoder.encode(" "));
            opening = false;
            controller.enqueue(encoder.encode(delta));
            wrote = true;
          });

          const calls = parts.filter((part) => part.functionCall);
          if (!calls.length) break;

          const results: GeminiPart[] = [];
          for (const { functionCall } of calls) {
            const { name, args, id } = functionCall!;
            const lead = name === SAVE_LEAD_TOOL.name ? parseLead(args, visitorText) : null;
            let outcome =
              "NOT SAVED. Nothing was sent to the team. The visitor has not given a valid email or phone number in this chat. Tell them nothing was sent yet and ask for one.";
            if (lead) {
              if (await admitLead(store, visitor)) {
                await store.push(
                  "chat:leads",
                  JSON.stringify({ ...lead, at: new Date().toISOString() }),
                  500,
                );
                console.info(`[chat] New lead: ${lead.name}`);
                await notifyLead(lead);
                outcome = "Saved. The team will be in touch.";
              } else {
                outcome = `Not saved: too many submissions today. Ask them to email ${EMAIL} instead.`;
              }
            }
            results.push({ functionResponse: { name, id, response: { result: outcome } } });
          }

          /* The model's turn goes back exactly as received: Gemini rejects
             a tool call whose signature has been stripped. */
          contents.push({ role: "model", parts }, { role: "user", parts: results });
        }
      } catch (error) {
        if (!request.signal.aborted) {
          console.error("[chat] Model call failed", error);
          controller.enqueue(encoder.encode((wrote ? "\n\n" : "") + NOTICES.error));
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: STREAM_HEADERS });
}
