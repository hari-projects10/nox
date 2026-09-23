import { motionValue } from "framer-motion";

/**
 * Viewport scroll state, held as module-level motion values rather than
 * React context.
 *
 * React Three Fiber renders through its own reconciler, so DOM-side context
 * does not cross the <Canvas> boundary. A module singleton is readable from
 * both the DOM tree and inside useFrame, and updating it never triggers a
 * React render.
 */

/** 0 → 1 through the whole document. */
export const scrollProgress = motionValue(0);

/** Signed scroll velocity in px/frame, as reported by Lenis. */
export const scrollVelocity = motionValue(0);
