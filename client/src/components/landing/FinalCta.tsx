import Link from "next/link";
import { brand } from "@/config/brand";
import FadeUp from "./FadeUp";
import RevealText from "./RevealText";

const FOOTER_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#foundation", label: "Foundation" },
];

const ACCOUNT_LINKS = [
  { href: "/login", label: "Sign in" },
  { href: "/signup", label: "Create account" },
];

/*
  Closing call to action with a beam of light falling from the button,
  then a quiet footer row, as in the reference.
*/
const FinalCta = () => (
  <section className="relative overflow-hidden px-4 pt-28 text-center">
    <div aria-hidden="true" className="landing-cta-beam pointer-events-none absolute left-1/2 top-[52%] h-[520px] w-[340px] -translate-x-1/2" />

    <FadeUp>
      <p className="font-display text-2xl font-bold text-white">{brand.name}</p>
    </FadeUp>
    <RevealText
      lines={["Start your knowledge base today"]}
      className="mx-auto mt-4 max-w-3xl text-4xl font-bold leading-tight text-white sm:text-6xl"
    />
    <FadeUp delay={0.2}>
      <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-[#c4b5fd]/80 sm:text-base">
        Upload your first document and ask it anything. It is free to start.
      </p>
    </FadeUp>
    <FadeUp delay={0.35} className="relative z-10 mt-10">
      <Link
        href="/signup"
        className="landing-button landing-button-large inline-flex rounded-full px-10 py-4 text-lg font-medium text-white"
      >
        Start for free
      </Link>
    </FadeUp>

    <footer className="relative z-10 mx-auto mt-48 flex max-w-6xl flex-col items-center gap-6 border-t border-white/10 py-8 text-sm text-white/50 sm:flex-row sm:justify-between">
      <nav className="flex gap-6">
        {FOOTER_LINKS.map((link) => (
          <a key={link.href} href={link.href} className="transition-colors hover:text-white">
            {link.label}
          </a>
        ))}
      </nav>
      <p className="text-xs text-white/35">
        © {new Date().getFullYear()} {brand.name}
      </p>
      <nav className="flex gap-6">
        {ACCOUNT_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="transition-colors hover:text-white">
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  </section>
);

export default FinalCta;
