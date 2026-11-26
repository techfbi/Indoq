import type { Transition, Variants } from "framer-motion";

/*
  Shared motion values so every surface moves the same way.
  Reduced motion is handled once by MotionConfig in Providers, which
  drops movement and keeps fades, so components never check it.
*/
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export const SPRING: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 34,
};

// Parent that reveals its children one after another
export const staggerParent: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

// Child of staggerParent, rises and fades in
export const riseItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } },
};
