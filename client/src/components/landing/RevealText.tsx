"use client";

import { motion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface RevealTextProps {
  lines: React.ReactNode[];
  as?: "h1" | "h2" | "h3";
  className?: string;
  delay?: number;
  // The hero animates on load, every other heading when scrolled into view
  onLoad?: boolean;
}

/*
  Each line rises from behind an invisible edge, one after another,
  the way the headings in the reference video appear. The clip lives
  on a wrapper so descenders are not cut once the line is in place.
*/
const RevealText = ({
  lines,
  as = "h2",
  className,
  delay = 0,
  onLoad = false,
}: RevealTextProps) => {
  const Tag = motion[as];
  const trigger = onLoad
    ? { animate: "visible" }
    : { whileInView: "visible", viewport: { once: true, amount: 0.6 } };

  return (
    <Tag
      className={cn("font-display tracking-tight", className)}
      initial="hidden"
      {...trigger}
      transition={{ staggerChildren: 0.12, delayChildren: delay }}
    >
      {lines.map((line, index) => (
        <span key={index} className="block overflow-hidden pb-[0.12em] -mb-[0.12em]">
          <motion.span
            className="block"
            variants={{
              hidden: { y: "105%", opacity: 0 },
              visible: {
                y: "0%",
                opacity: 1,
                transition: { duration: 0.8, ease: EASE_OUT },
              },
            }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
};

export default RevealText;
