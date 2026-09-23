export const site = {
  name: "NOXTEAM",
  hero: {
    headline: "Architecting the Digital Frontier.",
    subheadline:
      "We engineer kinetic interfaces and scalable architectures for the world’s most ambitious brands.",
  },
  /* PLACEHOLDER — swap for the real address before launch. */
  contact: {
    email: "hello@noxteam.com",
    cta: "Start a project",
  },
  nav: [
    { label: "Services", href: "#services" },
    { label: "Platforms", href: "#work" },
    { label: "Studio", href: "/studio" },
  ],
} as const;


/** Signature easing, matching --ease-out-expo in globals.css. */
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

/** Matches --ease-in-out-quint in globals.css. */
export const EASE_IN_OUT_QUINT = [0.83, 0, 0.17, 1] as const;
