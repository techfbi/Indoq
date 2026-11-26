"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { Activity, Layers, Lock, RotateCcw, Workflow, type LucideIcon } from "lucide-react";
import RevealText from "./RevealText";

/*
  Cards start scattered and tilted, then settle into a tidy layout as
  the section scrolls into view, the same move as the reference.
  Each card carries its own starting rotation and offset.
*/
interface Pillar {
  icon: LucideIcon;
  title: string;
  text: string;
  rotate: number;
  x: number;
  y: number;
  accent?: boolean;
}

const PILLARS: Pillar[] = [
  {
    icon: Lock,
    title: "Private workspaces",
    text: "Database level security keeps every workspace visible to its owner only.",
    rotate: -9, x: 60, y: 40,
  },
  {
    icon: Layers,
    title: "Hybrid search",
    text: "Meaning and keyword search combined, so exact terms and ideas both match.",
    rotate: 7, x: -60, y: 50,
  },
  {
    icon: RotateCcw,
    title: "Safe retries",
    text: "A failed upload continues where it stopped and is never charged twice.",
    rotate: -12, x: 90, y: -30, accent: true,
  },
  {
    icon: Activity,
    title: "Live progress",
    text: "Watch each document move from upload to ready in real time.",
    rotate: 4, x: 0, y: -60,
  },
  {
    icon: Workflow,
    title: "Visual answers",
    text: "Flowcharts and timelines drawn from your own content.",
    rotate: 11, x: -90, y: -20,
  },
];

const PillarCard = ({ pillar, progress }: { pillar: Pillar; progress: MotionValue<number> }) => {
  const rotate = useTransform(progress, [0, 1], [pillar.rotate, 0]);
  const x = useTransform(progress, [0, 1], [pillar.x, 0]);
  const y = useTransform(progress, [0, 1], [pillar.y, 0]);
  const Icon = pillar.icon;

  return (
    <motion.div
      style={{ rotate, x, y }}
      className={
        pillar.accent
          ? "landing-accent-card w-full rounded-3xl p-6 text-center sm:w-[220px]"
          : "landing-card w-full rounded-3xl p-6 text-center sm:w-[220px]"
      }
    >
      <span className="landing-icon mx-auto flex h-14 w-14 items-center justify-center rounded-2xl">
        <Icon className="h-6 w-6 text-white" strokeWidth={2} />
      </span>
      <h3 className="mt-4 font-display text-base font-bold text-white">{pillar.title}</h3>
      <p className="mt-2 text-xs leading-relaxed text-white/70">{pillar.text}</p>
    </motion.div>
  );
};

const Foundation = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "center center"],
  });

  return (
    <section ref={sectionRef} id="foundation" className="scroll-mt-24 px-4 py-24">
      <RevealText
        lines={["Built on a solid foundation"]}
        className="text-center text-4xl font-bold text-white sm:text-5xl"
      />
      <div className="mx-auto mt-14 flex max-w-3xl flex-wrap justify-center gap-4">
        {PILLARS.map((pillar) => (
          <PillarCard key={pillar.title} pillar={pillar} progress={scrollYProgress} />
        ))}
      </div>
    </section>
  );
};

export default Foundation;
