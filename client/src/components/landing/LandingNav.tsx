"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { brand } from "@/config/brand";
import { EASE_OUT } from "@/lib/motion";

const SECTIONS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#foundation", label: "Foundation" },
];

// Floating glass pill that drops into place when the page loads
const LandingNav = () => (
  <motion.nav
    initial={{ opacity: 0, y: -24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8, ease: EASE_OUT }}
    className="relative z-20 mx-auto flex w-full max-w-5xl items-center justify-between rounded-full border border-white/10 bg-white/6 py-2 pl-5 pr-2 backdrop-blur-xl"
  >
    <Link href="/" className="font-display text-lg font-bold tracking-tight text-white">
      {brand.name}
    </Link>

    <div className="hidden items-center gap-8 md:flex">
      {SECTIONS.map((section) => (
        <a
          key={section.href}
          href={section.href}
          className="text-sm text-white/70 transition-colors hover:text-white"
        >
          {section.label}
        </a>
      ))}
    </div>

    <div className="flex items-center gap-1">
      <Link
        href="/login"
        className="rounded-full px-3 py-2 text-sm text-white/80 transition-colors hover:text-white sm:px-4"
      >
        Sign in
      </Link>
      <Link
        href="/signup"
        className="landing-button rounded-full px-4 py-2 text-sm font-medium text-white"
      >
        Get started
      </Link>
    </div>
  </motion.nav>
);

export default LandingNav;
