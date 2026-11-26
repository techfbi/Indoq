"use client";

import { motion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";

interface FadeUpProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  onLoad?: boolean;
}

// Fades and lifts content into place, on load or when scrolled into view
const FadeUp = ({ children, className, delay = 0, onLoad = false }: FadeUpProps) => {
  const trigger = onLoad
    ? { animate: { opacity: 1, y: 0 } }
    : { whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.3 } };

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      {...trigger}
      transition={{ duration: 0.8, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
};

export default FadeUp;
