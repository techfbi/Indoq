"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/*
  Shown between sending a question and the first token. The server
  searches first and writes second, so the label follows that order
  and stays on the last step if the wait is long.
*/
const STEPS = ["Searching your documents", "Reading the best matches", "Writing an answer"];
const STEP_MS = 1600;

export const ThinkingIndicator = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(
      () => setStep((s) => Math.min(s + 1, STEPS.length - 1)),
      STEP_MS
    );
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div role="status" className="h-5 overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="text-shimmer block text-sm leading-5"
        >
          {STEPS[step]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};
