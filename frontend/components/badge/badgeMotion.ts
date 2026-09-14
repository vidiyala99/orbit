import type { Transition, Variants } from "framer-motion";

/**
 * Why the badge on screen is changing, so the leaving and arriving badges move to match.
 * `key` covers keyboard browsing and K/S: repeated constantly, so it swaps instantly.
 */
export type MotionKind = "load" | "browse" | "key" | "kept" | "skipped" | "undo";
export type MotionIntent = { kind: MotionKind; dir: 1 | -1; wide: boolean };

const EASE_OUT: Transition["ease"] = [0.23, 1, 0.32, 1];
const EASE_EXIT: Transition["ease"] = [0.32, 0.72, 0, 1];
const ARRIVE_SPRING: Transition = { type: "spring", duration: 0.42, bounce: 0.12 };
/** After Keep/Skip the next badge drops onto the clip with a small swing. */
const DROP_SPRING: Transition = { type: "spring", duration: 0.52, bounce: 0.28, delay: 0.06 };
const INSTANT: Transition = { duration: 0 };

const decided = (i: MotionIntent) => i.kind === "kept" || i.kind === "skipped";

export const deckVariants: Variants = {
  enter: (i: MotionIntent) => {
    if (i.kind === "load" || i.kind === "key") return { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 };
    if (decided(i)) return { opacity: 0, x: 0, y: i.wide ? 12 : -22, rotate: i.wide ? 0 : -1.5, scale: 0.98 };
    if (i.kind === "undo") return { opacity: 0, x: (i.wide ? 60 : 120) * i.dir, y: 0, rotate: i.wide ? 0 : 6 * i.dir, scale: 1 };
    return { opacity: 0, x: (i.wide ? 40 : 90) * i.dir, y: 0, rotate: i.wide ? 0 : 3 * i.dir, scale: 1 };
  },
  center: (i: MotionIntent) => ({
    opacity: 1,
    x: 0,
    y: 0,
    rotate: 0,
    scale: 1,
    transition:
      i.kind === "key" || i.kind === "load"
        ? INSTANT
        : decided(i)
          ? { ...DROP_SPRING, opacity: { duration: 0.18, delay: 0.06 } }
          : { ...ARRIVE_SPRING, duration: i.wide ? 0.3 : 0.42, opacity: { duration: 0.16 } },
  }),
  exit: (i: MotionIntent) => {
    if (i.kind === "key" || i.kind === "load") return { opacity: 0, transition: INSTANT };
    if (i.kind === "kept") {
      return { opacity: 0, x: i.wide ? 80 : "115%", y: i.wide ? 0 : -18, rotate: i.wide ? 0 : 11, transition: { duration: 0.28, ease: EASE_EXIT } };
    }
    if (i.kind === "skipped") {
      return { opacity: 0, x: i.wide ? -80 : "-115%", rotate: i.wide ? 0 : -8, transition: { duration: 0.26, ease: EASE_EXIT } };
    }
    if (i.kind === "undo") return { opacity: 0, scale: 0.96, transition: { duration: 0.15, ease: EASE_OUT } };
    return { opacity: 0, x: (i.wide ? -40 : -90) * i.dir, rotate: i.wide ? 0 : -3 * i.dir, transition: { duration: 0.2, ease: EASE_OUT } };
  },
};

/** A brief pink wash on the badge as it leaves on Keep. */
export const keepFlashVariants: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 0 },
  exit: (i: MotionIntent) =>
    i.kind === "kept" && !i.wide
      ? { opacity: [0, 0.32, 0], transition: { duration: 0.28, times: [0, 0.3, 1] } }
      : { opacity: 0, transition: INSTANT },
};

/** Counter digits roll in the browse direction. */
export const counterVariants: Variants = {
  enter: (i: MotionIntent) => (i.kind === "key" ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 * i.dir }),
  center: (i: MotionIntent) => ({ opacity: 1, y: 0, transition: i.kind === "key" ? INSTANT : { duration: 0.18, ease: EASE_OUT } }),
  exit: (i: MotionIntent) =>
    i.kind === "key" ? { opacity: 0, transition: INSTANT } : { opacity: 0, y: -8 * i.dir, transition: { duration: 0.14, ease: EASE_OUT } },
};

/** Real 3D flip with a slight lift at the midpoint, like picking the badge up to turn it. */
export const FLIP_TRANSITION: Transition = {
  rotateY: { type: "spring", duration: 0.55, bounce: 0.18 },
  scale: { duration: 0.5, times: [0, 0.45, 1], ease: "easeInOut" },
};

/** Swipe release: far enough, or flicked fast enough, browses. */
export const SWIPE_DISTANCE_PX = 80;
export const SWIPE_VELOCITY_PX_S = 500;
