import Link from "next/link";
import { FileText } from "lucide-react";
import FadeUp from "./FadeUp";
import RevealText from "./RevealText";

/*
  The capabilities grid. Like the reference it mixes one solid accent
  card, a tilted product view, a conversation, and a card with a call
  to action. All content describes what Within really does.
*/

const Sparkles = () => (
  <div aria-hidden="true" className="absolute inset-x-6 bottom-6 h-24">
    {[
      [8, 60, 3], [18, 30, 2], [30, 70, 4], [44, 40, 2], [56, 80, 3],
      [66, 20, 2], [74, 55, 5], [86, 35, 2], [92, 75, 3], [38, 10, 2],
    ].map(([x, y, size], index) => (
      <span
        key={index}
        className="landing-twinkle absolute rounded-full bg-white"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          width: size,
          height: size,
          animationDelay: `${index * 0.35}s`,
        }}
      />
    ))}
  </div>
);

const InspectorShot = () => (
  <div className="absolute -bottom-10 -right-6 left-10 top-12 perspective-[1000px] sm:left-16">
    <div
      className="landing-panel h-full rounded-2xl p-5"
      style={{ transform: "rotateX(18deg) rotateZ(-12deg) rotateY(-8deg)", transformOrigin: "left top" }}
    >
      <p className="font-display text-sm font-bold text-white">Sources for this answer</p>
      <ul className="mt-4 space-y-2.5">
        {[
          ["Doc 1", "Lease agreement.pdf", "Page 7 · Termination"],
          ["Doc 2", "Lease agreement.pdf", "Page 9 · Notices"],
          ["Doc 3", "Lease agreement.pdf", "Page 11 · Early exit"],
        ].map(([badge, file, where]) => (
          <li key={badge} className="flex items-center gap-3 rounded-xl bg-white/4 p-3">
            <span className="rounded-md bg-[#8b5cf6] px-1.5 py-0.5 text-[10px] font-medium text-white">
              {badge}
            </span>
            <FileText className="h-3.5 w-3.5 text-[#b794f6]" />
            <span className="text-xs text-white/85">{file}</span>
            <span className="ml-auto hidden text-[10px] text-white/45 sm:block">{where}</span>
          </li>
        ))}
      </ul>
    </div>
  </div>
);

const Thread = () => (
  <div aria-hidden="true" className="space-y-3">
    <div className="ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-md bg-[#6f2da8] px-3.5 py-2 text-xs text-white">
      Summarise the risks in the board report
    </div>
    <div className="landing-panel max-w-[92%] rounded-2xl rounded-bl-md p-3.5 text-xs leading-relaxed text-white/80">
      <p className="mb-1.5 font-medium text-white">Three risks stand out:</p>
      <ul className="list-disc space-y-1 pl-4">
        <li>Supplier costs up 14 percent <span className="text-[#c4b5fd]">[Doc 2]</span></li>
        <li>Hiring behind plan in two teams <span className="text-[#c4b5fd]">[Doc 4]</span></li>
        <li>One contract renews in March <span className="text-[#c4b5fd]">[Doc 5]</span></li>
      </ul>
    </div>
    <div className="ml-auto w-fit rounded-2xl rounded-br-md bg-[#6f2da8] px-3.5 py-2 text-xs text-white">
      Draw that as a flowchart
    </div>
  </div>
);

const Bento = () => (
  <section id="features" className="scroll-mt-24 px-4 py-24">
    <RevealText
      lines={["Everything your documents", "can tell you"]}
      className="text-center text-4xl font-bold leading-tight text-white sm:text-5xl"
    />

    <div className="mx-auto mt-14 grid max-w-5xl gap-4 md:grid-cols-3">
      <FadeUp className="landing-accent-card relative min-h-80 overflow-hidden rounded-3xl p-7 sm:p-8">
        <h3 className="font-display text-3xl font-bold leading-tight text-white">
          Every claim, cited.
        </h3>
        <p className="mt-4 text-sm leading-relaxed text-white/80">
          Click any citation to open the exact passage the answer came from.
        </p>
        <Sparkles />
      </FadeUp>

      <FadeUp delay={0.1} className="landing-card relative min-h-80 overflow-hidden rounded-3xl md:col-span-2">
        <InspectorShot />
      </FadeUp>

      <FadeUp className="landing-card relative grid overflow-hidden rounded-3xl md:col-span-2 md:grid-cols-[1fr_1.3fr]">
        <div className="flex flex-col justify-end p-7 sm:p-8">
          <h3 className="font-display text-3xl font-bold leading-tight text-white">
            Ask in plain language
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-white/65">
            Follow up, compare documents, or ask for a summary. Short questions get short
            answers.
          </p>
        </div>
        <div className="p-6 pt-0 md:pt-6">
          <Thread />
        </div>
      </FadeUp>

      <FadeUp delay={0.1} className="landing-card flex flex-col rounded-3xl p-7 sm:p-8">
        <h3 className="font-display text-2xl font-bold leading-tight text-white">
          Diagrams when words are not enough
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-white/65">
          Processes, timelines and hierarchies become flowcharts you can export as SVG.
        </p>
        <Link
          href="/signup"
          className="landing-button mt-auto w-fit rounded-full px-5 py-2 text-sm font-medium text-white"
        >
          Try it free
        </Link>
      </FadeUp>
    </div>
  </section>
);

export default Bento;
