/**
 * Window event fired when code moves the page on purpose, such as the
 * assistant taking a visitor to a section. Choreography that reads scroll
 * gestures (IntroSnap) stands down for it, as it does for an in-page link.
 */
export const DELIBERATE_SCROLL = "site:deliberate-scroll";
