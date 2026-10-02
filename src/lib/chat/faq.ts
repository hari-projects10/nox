import { site } from "@/lib/site";

/**
 * Prepared answers for the questions most visitors ask first.
 *
 * They cost no model quota, and each topic has several wordings so a
 * repeated question never gets the same reply twice. Anything they don't
 * cover cleanly goes to the model:
 *
 *   - long or detailed messages (a specific brief deserves a specific answer)
 *   - messages carrying an email or phone number (the model saves the lead)
 *   - a topic whose wordings have all been used in this conversation
 *
 * Messages in other languages simply don't match the English patterns.
 */

const NAME = site.name;
const EMAIL = site.contact.email;

type Faq = { id: string; match: RegExp; answers: string[] };

/* Order matters: the first match wins, so narrower topics come first. */
const FAQS: Faq[] = [
  {
    id: "greeting",
    match: /^(hi+|hello+|hey+|hii+|hai|yo|hola|namaste|vanakkam|good (morning|afternoon|evening)|greetings)( there| team| gatveon)?$/,
    answers: [
      `Hi there! What are you hoping to build? A website, an app, an AI agent, or something else entirely?`,
      `Hello! Tell me a little about your project and I'll show you how ${NAME} can help.`,
      `Hey, welcome to ${NAME}. Are you exploring an idea, or do you already have a project in mind?`,
      `Hi! I can walk you through our services, show you our work, or connect you with the team. Where would you like to start?`,
      `Hello and welcome. What kind of product are you thinking about: web, mobile, AI, or design?`,
      `Hey! Happy to help. What's the problem you're looking to solve for your business?`,
      `Hi, great to have you here. Ask me anything about ${NAME}, or tell me what you'd like to build.`,
      `Welcome! Whether it's a new website, an app or an AI agent, I can point you in the right direction. What's on your mind?`,
    ],
  },
  {
    id: "contact",
    match: /\b(contact|reach (you|out)|get in touch|talk to (someone|a person|a human|the team|you)|speak (to|with)|book (a )?(call|meeting)|schedule (a )?(call|meeting)|call me|phone number|your (email|number|phone)|whatsapp)\b/,
    answers: [
      `Happy to set that up. Share your name and an email or phone number here and the team will reach out to arrange a time. You can also email us at ${EMAIL}.`,
      `Of course. Drop your name and the best email or number to reach you, and I'll pass it straight to the team. Or write to ${EMAIL} directly.`,
      `The quickest way is to leave your name and contact details right here, and the team will get back to you to schedule a call. Email works too: ${EMAIL}.`,
      `Sure! Tell me your name, an email or phone number, and a line about your project, and I'll make sure the team follows up.`,
      `You can reach the team at ${EMAIL}, or share your name and contact details with me and they'll reach out to you.`,
      `Let's get you connected. What's your name, and what's the best email or phone number for the team to use?`,
      `Absolutely. A short discovery call is the best first step. Share your name and how to reach you, and the team will arrange a time that suits you.`,
      `Glad you'd like to talk. Leave your name and an email or number here, or email ${EMAIL} if you prefer, and we'll be in touch.`,
    ],
  },
  {
    id: "pricing",
    match: /\b(price|prices|pricing|cost|costs|how much|budget|rate|rates|charge|charges|fee|fees|quote|quotation|expensive|affordable|cheap)\b/,
    answers: [
      `Pricing depends on scope: what the product needs to do, how many screens, and which integrations. After a short discovery call you get a fixed quote, so there are no surprises.`,
      `Every project is priced on what it actually needs. We start with a quick call, then send a written scope with a fixed price and timeline.`,
      `There's no one-size price, since a landing page and an AI platform are very different builds. Tell us about your project and you'll get a clear, fixed quote after a short call.`,
      `We quote a fixed price per project rather than charging by the hour. A short discovery call is all it takes to put a number on it.`,
      `Cost comes down to scope and complexity. Share what you have in mind and the team will come back with a fixed-price proposal.`,
      `We keep pricing simple: one discovery call, then a written scope with a fixed price. Would you like to set that up?`,
      `It really depends on what you'd like built. The good news is you'll get a fixed quote up front, after a quick conversation about your goals.`,
      `Each project gets its own fixed-price quote once we understand the scope. If you share a few details, I can pass them to the team to get that started.`,
    ],
  },
  {
    id: "timeline",
    match: /\b(how long|timeline|time ?frame|turnaround|deadline|how (soon|fast|quickly)|when can you (start|deliver|finish)|delivery time|take to (build|make|develop|finish))\b/,
    answers: [
      `It depends on scope. Focused websites move quickly, while larger apps and AI systems take longer. You get a fixed timeline in the written scope before any work starts.`,
      `Timelines are set per project. After a short discovery call, the scope we send includes a clear schedule with milestones.`,
      `Smaller builds can move fast, and bigger platforms are planned in stages. Either way, you'll know the exact timeline before we begin.`,
      `We agree on the timeline up front, as part of the written scope. If you have a deadline in mind, share it and the team will plan around it.`,
      `That comes down to what's being built. Tell us about the project and any launch date you're aiming for, and we'll give you a realistic, fixed schedule.`,
      `Every project gets a committed timeline in its scope. Got a launch date in mind? Let me know and I'll pass it on to the team.`,
      `Speed depends on scope and how quickly feedback flows. We map it all out in the proposal, so you know exactly when each stage lands.`,
    ],
  },
  {
    id: "process",
    match: /\b(process|how (does|do) (it|this|a project|you) work|how do (we|you) (start|begin|work)|what are the steps|steps involved|get started|onboarding|workflow)\b/,
    answers: [
      `It's simple: a short discovery call, then a written scope with a fixed price and timeline. After that we design, build and launch, with support after go-live. Shall we start with a quick call?`,
      `We start with a quick call to understand your goals. You then get a clear scope and a fixed quote, and once approved, we design, build and launch. What's the idea you'd like to bring to life?`,
      `Step one is a discovery call. Step two is a written scope with price and timeline. Then design, development and launch. Tell me a little about your project and we'll take it from there.`,
      `Every project follows the same path: discover, scope, design, build, launch, and you know the price and timeline before work begins. What are you hoping to build?`,
      `First we talk, so we understand the problem. Then we put it in writing with a fixed price, and our team designs, builds and ships it. Would you like to book that first conversation?`,
      `Getting started takes one conversation. From there you get a fixed-price scope, and we handle design, development and launch end to end. Share your name and email, and the team will reach out.`,
      `We keep it clear and predictable: a discovery call, a fixed-price proposal, then design and build with regular check-ins. What would you like to build first?`,
    ],
  },
  {
    id: "portfolio",
    match: /\b(portfolio|previous (work|projects)|past (work|projects)|your work|case stud(y|ies)|(see|show me) (some |your )?(examples|samples|work)|demos?|projects you('ve| have) (done|built))\b/,
    answers: [
      `The pieces in the Platforms section are a curated selection of demo work, not our full portfolio. Both are live, so try them for yourself. If you'd like to see more, we're happy to walk you through it on a short call.`,
      `Happy to show you. The Platforms section features a few demo builds rather than our complete body of work: Smart HR and Veloce, both live and clickable. Shall I set up a call to walk you through more?`,
      `What you'll find in the Platforms section are demo pieces that show how we design and build, not the full portfolio. For a deeper look at our work, the team can take you through it on a call.`,
      `Here's a glimpse: the Platforms section shares selected demos rather than every project. Want a walkthrough of more of our work? Leave your name and email and the team will arrange it.`,
      `Our site shows a small selection of demo work in the Platforms section, and you can try both live. We'd be glad to share more of our work on a short discovery call.`,
      `Of course. Please note the Platforms section holds demo pieces, a sample of how we work rather than our full portfolio. If you'd like to see more, just ask for a call.`,
      `The Platforms section holds a selection of our demo work, live and interactive. It's a sample rather than the full portfolio, so if you'd like to see more, we can walk you through it on a call.`,
    ],
  },
  {
    id: "ai-agents",
    match: /\b(ai agents?|agents?|chat ?bots?|automation|automate|ai assistant|virtual assistant|llm|gpt|artificial intelligence)\b/,
    answers: [
      `Yes, AI agents are one of our specialities. They don't just answer questions; they handle real workflows like bookings, lead follow-up and support. What would you love to take off your team's plate?`,
      `Definitely. We build agents that take work off your team: answering customers, qualifying leads, scheduling and routine operations. Which of those matters most for your business?`,
      `We do. An agent can handle enquiries around the clock, capture leads, book appointments, and hand off to your team when a person is needed. What kind of business do you run?`,
      `Absolutely. Our Smart HR demo shows AI agents running payroll, hiring and approvals, and we bring the same approach to support, sales and operations. Where does your team lose the most time?`,
      `Yes! Think of an agent as a teammate that never sleeps: it answers questions, books calls and follows up on leads, with every step reviewable. What would yours take care of?`,
      `We build custom AI agents around how your business actually works, from customer support to lead handling and internal operations. Tell me a little about how your team works today.`,
      `That's right in our wheelhouse. Tell me what tasks eat up your team's time, and I can suggest how an agent could take them on.`,
      `For sure. From a website assistant like me to agents that run entire workflows, we design them to save time and capture more business. What would you want yours to do?`,
    ],
  },
  {
    id: "services",
    match: /\b(what (do|can) you (do|build|make|offer)|services?|what (does|is) gatveon|who are you|about (you|gatveon)|what you do|offerings?)\b/,
    answers: [
      `${NAME} designs and builds websites, mobile apps, AI apps and AI agents, along with UI/UX and brand design. What are you hoping to build?`,
      `We're a product studio: websites and web platforms, iOS and Android apps, AI-powered apps, AI agents that automate real work, and design. What's on your roadmap?`,
      `In short, we build digital products end to end: design, websites, mobile apps, and AI systems that do real work for your business. What would you like to create?`,
      `We cover the full journey, from design to web and mobile to AI. A popular combination is a website with an AI agent that captures and answers leads. What does your business need right now?`,
      `Websites, mobile apps, AI apps, AI agents and design, all under one roof. Is there a particular project you have in mind?`,
      `${NAME} builds high-polish websites, native-quality mobile apps, and AI products, including agents that automate workflows. What would help your business most?`,
      `We help businesses launch digital products: modern websites, mobile apps, AI tools and agents, plus the design that ties it together. Where would you like to start?`,
      `Think of us as your product team: we design, build and launch websites, apps and AI systems. Tell me about your idea and I'll point you to the right fit.`,
    ],
  },
];

/** Longer messages carry specifics a prepared answer would ignore. */
const MAX_LENGTH = 90;

/**
 * Contact details or an introduction mean a lead in progress: the model
 * handles it, so it can save the details rather than ask for them again.
 */
const PERSONAL = /[\w.+-]+@[\w-]+\.[\w.-]+|\d[\d\s-]{6,}\d|\b(my name|i am|i'm|this is)\b/i;

const normalise = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'@.-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.\s]+$/, "");

/**
 * A prepared answer for the newest message, or null to ask the model.
 * Wordings already used in this conversation are skipped.
 */
export function answerFromFaq(history: { role: string; content: string }[]) {
  const latest = history.at(-1);
  if (!latest || latest.role !== "user") return null;

  const text = normalise(latest.content);
  if (!text || text.length > MAX_LENGTH || PERSONAL.test(latest.content)) return null;

  const faq = FAQS.find((entry) => entry.match.test(text));
  if (!faq) return null;

  const said = new Set(history.filter((turn) => turn.role === "assistant").map((turn) => turn.content.trim()));
  const fresh = faq.answers.filter((answer) => !said.has(answer));
  if (!fresh.length) return null;

  return fresh[Math.floor(Math.random() * fresh.length)];
}

/**
 * Stream a prepared answer the way a model reply arrives: a short pause,
 * then a few words at a time.
 */
export function streamPrepared(answer: string, signal: AbortSignal) {
  const encoder = new TextEncoder();
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const chunks = answer.match(/\S+\s*/g) ?? [answer];

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      await wait(450 + Math.random() * 400);
      for (let i = 0; i < chunks.length && !signal.aborted; i += 2) {
        controller.enqueue(encoder.encode(chunks.slice(i, i + 2).join("")));
        await wait(25 + Math.random() * 35);
      }
      controller.close();
    },
  });
}
