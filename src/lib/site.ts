export const site = {
  name: "GATVEON",
  hero: {
    headline: "Architecting the Digital Frontier.",
    subheadline:
      "We engineer AI agents, intelligent systems and digital products for the world’s most ambitious brands.",
    /* Plain-language list of what we build, set as an index line under the
       headline so a first-time visitor knows the offer at a glance. `slide`
       is the capability (sections/capabilities.tsx) each one opens on;
       null just goes to Services, for work without a clip of its own yet. */
    offer: [
      { label: "AI Agents", slide: "agents" },
      { label: "AI Systems", slide: "ai-systems" },
      { label: "Software", slide: "enterprise" },
      { label: "Websites", slide: "ai-web" },
      { label: "Mobile Apps", slide: "mobile" },
      { label: "Automation", slide: "agents" },
      { label: "Design", slide: "ai-web" },
      { label: "Video Editing", slide: null },
    ],
  },
  /* The studio's public inbox (Zoho Mail). Used by the footer, the assistant
     and every "email us" fallback. */
  contact: {
    email: "contact@gatveon.com",
    cta: "Contact Us",
    /* WhatsApp Business. `link` opens a chat with the studio; `start` also
       fills in a first line, so a visitor only has to press send. */
    whatsapp: {
      display: "+91 94005 22846",
      link: "https://wa.me/919400522846",
      start: `https://wa.me/919400522846?text=${encodeURIComponent("Hi GATVEON, I'd like to talk about a project.")}`,
    },
  },
  nav: [
    { label: "Services", href: "#services" },
    { label: "Platforms", href: "#work" },
    // { label: "Studio", href: "/studio" },
  ],
} as const;


/** Signature easing, matching --ease-out-expo in globals.css. */
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

/** Matches --ease-in-out-quint in globals.css. */
export const EASE_IN_OUT_QUINT = [0.83, 0, 0.17, 1] as const;

/**
 * For footage used as moving imagery, not as a video: opts out of every
 * native media affordance (picture-in-picture, casting, the controls strip
 * and its overflow menu), so nothing ever offers to play, pause or pop it
 * out. The CSS side of this lives under "Ambient video" in globals.css.
 */
export const AMBIENT_VIDEO = {
  controls: false,
  disablePictureInPicture: true,
  disableRemotePlayback: true,
  controlsList: "nodownload nofullscreen noremoteplayback noplaybackrate",
  "x-webkit-airplay": "deny",
  tabIndex: -1,
} as const;
