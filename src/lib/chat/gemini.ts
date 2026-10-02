import { CHAT } from "./config";

/**
 * A minimal Gemini client over the REST API's server-sent-event stream.
 * No SDK: the assistant needs one endpoint, and this keeps the bundle and
 * dependency list unchanged.
 */

const API = "https://generativelanguage.googleapis.com/v1beta/models";

export type GeminiPart = {
  text?: string;
  thought?: boolean;
  functionCall?: { name: string; args?: Record<string, unknown>; id?: string };
  functionResponse?: { name: string; id?: string; response: Record<string, unknown> };
  /* Gemini 3 signs its tool calls; the signature must be sent back intact. */
  thoughtSignature?: string;
};

export type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

export type GeminiRequest = {
  systemInstruction: { parts: { text: string }[] };
  contents: GeminiContent[];
  tools?: { functionDeclarations: Record<string, unknown>[] }[];
};

/** How long a model gets to start replying before the backup is tried. */
const START_TIMEOUT_MS = 8000;

/** Overloaded or out of quota: worth trying the backup model. */
const RETRYABLE = new Set([429, 500, 503]);

/**
 * Open a streaming reply, falling through to the backup model when the
 * first is overloaded or its free quota is spent.
 */
export async function openStream(request: GeminiRequest, signal: AbortSignal) {
  let lastError: unknown;

  for (const model of CHAT.models) {
    /* The free tier occasionally stalls before replying. If a model hasn't
       started answering in time, move on rather than leave a visitor
       waiting. The timer stops once the reply starts streaming. */
    const attempt = new AbortController();
    const abort = () => attempt.abort();
    signal.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(abort, START_TIMEOUT_MS);

    try {
      const response = await fetch(`${API}/${model}:streamGenerateContent?alt=sse`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY ?? "",
        },
        body: JSON.stringify({
          ...request,
          generationConfig: {
            maxOutputTokens: CHAT.maxOutputTokens,
            /* Short answers don't need reasoning; this keeps replies fast. */
            thinkingConfig: { thinkingLevel: "minimal" },
          },
        }),
        /* Still tied to the visitor: closing the chat stops the stream. */
        signal: attempt.signal,
        cache: "no-store",
      });
      clearTimeout(timer);

      if (response.ok && response.body) return response;

      lastError = new Error(`Gemini ${model} responded ${response.status}: ${await response.text()}`);
      if (!RETRYABLE.has(response.status)) break;
    } catch (error) {
      clearTimeout(timer);
      if (signal.aborted) throw error;
      lastError = new Error(`Gemini ${model} did not start replying in time`, { cause: error });
    }
    signal.removeEventListener("abort", abort);
  }

  throw lastError;
}

/**
 * Read a streamed reply, passing visible text on as it arrives. Returns
 * every part the model produced, for the conversation's next turn.
 */
export async function readStream(response: Response, onText: (text: string) => void) {
  const parts: GeminiPart[] = [];
  const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";

  const handle = (line: string) => {
    if (!line.startsWith("data:")) return;
    const chunk = JSON.parse(line.slice(5)) as {
      candidates?: { content?: { parts?: GeminiPart[] } }[];
    };
    for (const part of chunk.candidates?.[0]?.content?.parts ?? []) {
      if (part.text && !part.thought) onText(part.text);
      if (part.text === "" && !part.thoughtSignature) continue;
      parts.push(part);
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    lines.forEach((line) => handle(line.trim()));
  }
  handle(buffer.trim());

  return parts;
}
