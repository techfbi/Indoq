"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { EASE_OUT } from "@/lib/motion";
import FadeUp from "./FadeUp";
import ProductPreview from "./ProductPreview";
import RevealText from "./RevealText";

/*
  The headline reveals line by line, then the buttons fade up, then the
  workspace preview rises in. While scrolling, the preview straightens
  from a slight backward tilt, which gives the page its sense of depth.
*/
const Hero = () => {
  const previewRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: previewRef,
    offset: ["start end", "center center"],
  });
  const rotateX = useTransform(scrollYProgress, [0, 1], [22, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.92, 1]);

  return (
    <section className="relative px-4 pb-10 pt-20 text-center sm:pt-28">
      <RevealText
        as="h1"
        onLoad
        delay={0.3}
        className="mx-auto max-w-4xl text-5xl font-bold leading-[1.02] text-white sm:text-6xl lg:text-7xl"
        lines={[
          "Your documents,",
          <>
            <span className="landing-gradient-text">finally</span> answerable.
          </>,
        ]}
      />

      <FadeUp onLoad delay={0.75}>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
          Upload PDFs, Word files and notes. Within reads them, indexes them, and answers your
          questions with a citation to the exact passage.
        </p>
      </FadeUp>

      <FadeUp
        onLoad
        delay={0.95}
        className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
      >
        <Link
          href="/signup"
          className="landing-button group inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-3 text-sm font-medium text-white sm:w-auto"
        >
          Start for free
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <a
          href="#how-it-works"
          className="inline-flex w-full items-center justify-center rounded-full border border-white/15 bg-white/3 px-7 py-3 text-sm text-white/90 transition-colors hover:border-white/30 hover:bg-white/6 sm:w-auto"
        >
          See how it works
        </a>
      </FadeUp>

      <div className="mx-auto mt-16 max-w-5xl perspective-[1400px] sm:mt-20">
        <motion.div
          ref={previewRef}
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: EASE_OUT, delay: 1.1 }}
          style={{ rotateX, scale, transformOrigin: "center top" }}
          className="relative"
        >
          <ProductPreview />
          {/* Fades the bottom of the preview into the page */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-[#05040a] to-transparent" />
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
