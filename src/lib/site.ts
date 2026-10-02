export const site = {
  name: "GATVEON",
  hero: {
    headline: "Architecting the digital frontier.",
    subheadline:
      "We engineer kinetic interfaces and scalable architectures for the world’s most ambitious brands.",
  },
  /* PLACEHOLDER — swap for the real address before launch. */
  contact: {
    email: "hello@gatveon.com",
    cta: "Start a project",
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
