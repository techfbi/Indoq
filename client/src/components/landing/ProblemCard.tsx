"use client";

import { motion } from "framer-motion";
import FadeUp from "./FadeUp";
import RevealText from "./RevealText";

/*
  File tags hanging on thin threads that sway gently, like the tags in
  the reference. Each thread swings around its top end. left and length
  are in percent of the tag area, tilt is the resting angle of the tag.
*/
const TAGS = [
  { label: "Q3 board report.pdf", left: 18, length: 30, tilt: -6, swing: 3, highlight: false },
  { label: "Lease agreement.pdf", left: 22, length: 58, tilt: 5, swing: 2.5, highlight: true },
  { label: "Meeting notes.md", left: 30, length: 84, tilt: -2, swing: 2, highlight: false },
  { label: "Research.docx", left: 68, length: 44, tilt: 4, swing: 3.5, highlight: false },
  { label: "Policy v3.pdf", left: 62, length: 72, tilt: -5, swing: 2.5, highlight: false },
];

const HangingTag = ({ tag, index }: { tag: (typeof TAGS)[number]; index: number }) => (
  <motion.div
    className="absolute top-0 flex flex-col items-center"
    style={{ left: `${tag.left}%`, height: `${tag.length}%`, transformOrigin: "top center" }}
    animate={{ rotate: [-tag.swing, tag.swing] }}
    transition={{
      duration: 3.2 + index * 0.4,
      repeat: Infinity,
      repeatType: "mirror",
      ease: "easeInOut",
    }}
  >
    <span className="w-px flex-1 bg-linear-to-b from-transparent via-[#8b5cf6]/50 to-[#b794f6]" />
    <span className="h-2 w-2 rounded-full bg-[#c4b5fd] shadow-[0_0_10px_2px_rgba(167,139,250,0.8)]" />
    <span
      className={
        tag.highlight
          ? "-mt-1 whitespace-nowrap rounded-lg bg-[#7c3aed] px-3 py-1.5 text-xs text-white shadow-[0_8px_24px_rgba(124,58,237,0.45)]"
          : "-mt-1 whitespace-nowrap rounded-lg border border-white/15 bg-[#1a1530]/90 px-3 py-1.5 text-xs text-white/85"
      }
      style={{ rotate: `${tag.tilt}deg` }}
    >
      {tag.label}
    </span>
  </motion.div>
);

const ProblemCard = () => (
  <section className="px-4 py-10">
    <FadeUp className="landing-card relative mx-auto grid max-w-5xl overflow-hidden rounded-3xl md:grid-cols-2">
      <div className="relative z-10 flex flex-col justify-end p-8 sm:p-10">
        <RevealText
          lines={["Answers are buried", "in your files"]}
          className="text-3xl font-bold leading-tight text-white sm:text-4xl"
        />
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/65 sm:text-base">
          Contracts, reports and notes pile up. Searching them by hand is slow, and a guess
          is worse than no answer.
        </p>
      </div>
      <div aria-hidden="true" className="relative h-64 md:h-auto md:min-h-72">
        {TAGS.map((tag, index) => (
          <HangingTag key={tag.label} tag={tag} index={index} />
        ))}
      </div>
    </FadeUp>
  </section>
);

export default ProblemCard;
