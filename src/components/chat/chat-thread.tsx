"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, MessageCircle } from "lucide-react";

import { DEMOS, type DemoId } from "@/lib/demos";
import { EASE_OUT_EXPO, site } from "@/lib/site";
import { cn } from "@/lib/utils";

import { Orb } from "./orb";

export type Message = {
  role: "user" | "assistant";
  content: string;
  /** A limit or error notice: shown, but never sent back as history. */
  notice?: boolean;
  /**
   * A reply that sends the visitor somewhere on the page. It goes on its own
   * after a short, visible countdown, unless the visitor chooses to stay.
   */
  goTo?: { hash: string; state: "pending" | "done" | "stayed" };
};

/** Every action in the thread does something visible, or isn't offered. */
type Actions = {
  /** The section the visitor is looking at now, if any. */
  here: string | null;
  onSection: (hash: string) => void;
  onOpenDemo: (id: DemoId) => void;
};

/* ------------------------------------------------------------------ */
/*  Links in replies                                                  */
/* ------------------------------------------------------------------ */

/** Sections a reply can point at, and where they live on the page. */
const SECTIONS: Record<string, string> = {
  Platforms: "#work",
  Services: "#services",
  Labs: "#labs",
};

const LINK =
  /([\w.+-]+@[\w-]+\.[\w.-]+|https?:\/\/[^\s)]+|\b(?:Platforms|Services|Labs) section\b)/g;

const linkStyle =
  "font-medium text-headline underline decoration-black/20 underline-offset-[3px] transition-colors hover:decoration-black/70";

/**
 * Plain text in, never HTML: emails and URLs become links, and a mention
 * of a section becomes a way to go there. A section the visitor is already
 * looking at stays plain text, since a link there would do nothing.
 */
function Linkified({ text, here, onSection }: { text: string } & Omit<Actions, "onOpenDemo">) {
  return text.split(LINK).map((part, i) => {
    if (i % 2 === 0) return part;

    const section = SECTIONS[part.replace(/ section$/, "")];
    if (section) {
      return section === here ? (
        <span key={i} className="font-medium text-headline">
          {part}
        </span>
      ) : (
        <button key={i} type="button" onClick={() => onSection(section)} className={linkStyle}>
          {part}
        </button>
      );
    }

    const clean = part.replace(/[.,]+$/, "");
    const tail = part.slice(clean.length);
    const href = clean.includes("@") && !clean.startsWith("http") ? `mailto:${clean}` : clean;
    return (
      <span key={i}>
        <a
          href={href}
          target={href.startsWith("http") ? "_blank" : undefined}
          rel="noreferrer"
          className={linkStyle}
        >
          {clean}
        </a>
        {tail}
      </span>
    );
  });
}

/* ------------------------------------------------------------------ */
/*  Thread                                                            */
/* ------------------------------------------------------------------ */

const enter = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: EASE_OUT_EXPO },
} as const;

/**
 * The conversation. Replies read as editorial text beside the orb, not as
 * chat bubbles; the visitor's own words sit in the site's dark pill.
 */
export function ChatThread({
  messages,
  pending,
  onStay,
  autoGoMs,
  ...actions
}: {
  messages: Message[];
  pending: boolean;
  onStay: (index: number) => void;
  /** How long a pending trip waits, shown as the chip's progress line. */
  autoGoMs: number;
} & Actions) {
  return (
    <motion.div
      key="thread"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.4 } }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      aria-busy={pending}
      className="space-y-6 py-6"
    >
      {messages.map((message, i) => {
        const live = pending && i === messages.length - 1;

        if (message.role === "user") {
          return (
            <motion.div key={i} {...enter} className="flex justify-end pl-10">
              <p className="whitespace-pre-wrap break-words rounded-[20px] rounded-br-[6px] bg-headline px-4 py-2.5 text-[14px] leading-[1.5] text-white shadow-[0_6px_20px_-10px_rgba(11,11,15,0.5)]">
                {message.content}
              </p>
            </motion.div>
          );
        }

        return (
          <motion.div key={i} {...enter} className="flex gap-3 pr-4">
            <Orb size={22} thinking={live} className="mt-px" />

            <div className="min-w-0 flex-1">
              {message.notice ? (
                <Notice text={message.content} {...actions} />
              ) : message.content ? (
                <>
                  <p className="whitespace-pre-wrap break-words text-[14px] leading-[1.65] text-ink/85">
                    <Linkified text={message.content} {...actions} />
                    {live && <span aria-hidden="true" className="chat-caret text-ink/50" />}
                  </p>
                  {message.goTo && (
                    <Trip
                      state={message.goTo.state}
                      autoGoMs={autoGoMs}
                      onStay={() => onStay(i)}
                      onOpenDemo={actions.onOpenDemo}
                    />
                  )}
                </>
              ) : (
                <p className="chat-shimmer pt-px text-[13.5px] font-medium">Thinking</p>
              )}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

/**
 * Under a reply that points to the work. While the page is on its way, a
 * line fills over the countdown so the move never comes as a surprise.
 * Once there (or if the visitor stays), it offers the demos themselves,
 * which open their live windows from anywhere.
 */
function Trip({
  state,
  autoGoMs,
  onStay,
  onOpenDemo,
}: {
  state: NonNullable<Message["goTo"]>["state"];
  autoGoMs: number;
  onStay: () => void;
  onOpenDemo: (id: DemoId) => void;
}) {
  const chip =
    "relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-white/85 py-1.5 pl-3.5 pr-3 text-[12px] font-medium text-ink-soft ring-1 ring-black/[0.07]";

  if (state === "pending") {
    return (
      <motion.div
        className="mt-3 flex items-center gap-3"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
      >
        <span className={chip} role="status">
          Taking you to the demos
          <ArrowDownRight className="size-3.5" strokeWidth={2} />
          <motion.span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-indigo-400/80"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: autoGoMs / 1000, ease: "linear" }}
          />
        </span>
        <button
          type="button"
          onClick={onStay}
          className="-mx-2 -my-2 px-2 py-2 text-[12px] text-ink-muted underline-offset-2 transition-colors hover:text-headline hover:underline"
        >
          Stay here
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="mt-3 flex flex-wrap gap-2"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
    >
      {(Object.keys(DEMOS) as DemoId[]).map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onOpenDemo(id)}
          className={cn(
            chip,
            "group transition-colors duration-300 hover:bg-headline hover:text-white hover:ring-headline pointer-coarse:py-2.5",
          )}
        >
          {/* The product's own colour, as on its demo window. */}
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full"
            style={{ background: DEMOS[id].accent }}
          />
          Try {DEMOS[id].name}
          <ArrowUpRight
            className="size-3.5 transition-transform duration-500 ease-out-expo group-hover:rotate-45"
            strokeWidth={2}
          />
        </button>
      ))}
    </motion.div>
  );
}

/** A limit or failure: said plainly, with the way to a person right there. */
function Notice({ text, here, onSection }: { text: string } & Omit<Actions, "onOpenDemo">) {
  return (
    <div className="rounded-2xl bg-white/80 p-4 ring-1 ring-black/[0.06] shadow-[0_8px_24px_-16px_rgba(11,11,15,0.3)]">
      <p className="text-[13.5px] leading-relaxed text-ink-soft">
        <Linkified text={text} here={here} onSection={onSection} />
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={`mailto:${site.contact.email}`}
          className="group inline-flex items-center gap-2.5 rounded-full bg-headline py-1 pl-4 pr-1 text-[12.5px] font-medium text-white transition-colors hover:bg-black/80 pointer-coarse:py-2"
        >
          Email the team
          <span className="flex size-6 items-center justify-center rounded-full bg-white text-headline">
            <ArrowUpRight
              className="size-3.5 transition-transform duration-500 ease-out-expo group-hover:rotate-45"
              strokeWidth={2}
            />
          </span>
        </a>
        <a
          href={site.contact.whatsapp.start}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-[12.5px] font-medium text-headline ring-1 ring-black/10 transition-colors hover:bg-black/[0.03] pointer-coarse:py-2.5"
        >
          <MessageCircle className="size-3.5" strokeWidth={2} />
          WhatsApp
        </a>
      </div>
    </div>
  );
}
