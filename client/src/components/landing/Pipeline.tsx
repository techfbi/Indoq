import FadeUp from "./FadeUp";
import RevealText from "./RevealText";

/*
  The four stages every document goes through, wired into a glowing
  chip like the reference. On large screens the cards and traces use
  a fixed 960 by 380 layout so the SVG lines meet the cards exactly.
  Smaller screens get a plain grid without traces.
*/
const STAGES = [
  { title: "Upload", text: "PDF, Word, text and Markdown files" },
  { title: "Read", text: "Text extracted and split by section" },
  { title: "Index", text: "Searchable by meaning and by keyword" },
  { title: "Answer", text: "Grounded replies with citations" },
];

// Card positions in the desktop layout, left column then right column
const CARD_SPOTS = [
  { left: 0, top: 40 },
  { left: 222, top: 40 },
  { left: 0, top: 236 },
  { left: 222, top: 236 },
];

const FEEDS = [
  "M190 92 H222",
  "M190 288 H222",
  "M412 92 H470 Q500 92 500 122 V160 Q500 190 530 190 H620",
  "M412 288 H470 Q500 288 500 258 V220 Q500 190 530 190 H620",
];

// Short circuit traces fanning out of the chip, each ends in a dot
const TRACES = [
  ...[130, 160, 190, 220, 250].map((y, i) => ({
    d: `M800 ${y} H${830 + i * 6} L${850 + i * 6} ${y + (i - 2) * 14} H${900 + (i % 2) * 30}`,
    end: [900 + (i % 2) * 30, y + (i - 2) * 14],
  })),
  ...[660, 690, 720, 750].map((x, i) => ({
    d: `M${x} 100 V80 L${x + (i - 1.5) * 12} 60 V${46 - (i % 2) * 14}`,
    end: [x + (i - 1.5) * 12, 46 - (i % 2) * 14],
  })),
  ...[660, 690, 720, 750].map((x, i) => ({
    d: `M${x} 280 V300 L${x - (i - 1.5) * 12} 320 V${334 + (i % 2) * 14}`,
    end: [x - (i - 1.5) * 12, 334 + (i % 2) * 14],
  })),
];

const StageCard = ({ title, text }: { title: string; text: string }) => (
  <div className="landing-card flex h-full flex-col items-center justify-center rounded-2xl px-4 py-5 text-center">
    <p className="font-display text-sm font-bold text-white">{title}</p>
    <p className="mt-1.5 text-xs leading-relaxed text-white/60">{text}</p>
  </div>
);

const Chip = () => (
  <div className="landing-chip flex h-full w-full items-center justify-center rounded-[28px]">
    <span className="font-display text-6xl font-bold text-white">AI</span>
  </div>
);

const Pipeline = () => (
  <section id="how-it-works" className="scroll-mt-24 px-4 py-24 text-center">
    <RevealText
      lines={["From upload to answer"]}
      className="text-4xl font-bold text-white sm:text-5xl"
    />
    <FadeUp delay={0.2}>
      <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-white/65 sm:text-base">
        Every document goes through the same careful pipeline, so each answer is built only
        from what you uploaded.
      </p>
    </FadeUp>

    {/* Desktop: fixed layout with traces */}
    <FadeUp delay={0.3} className="relative mx-auto mt-16 hidden h-[380px] w-[960px] lg:block">
      <svg
        aria-hidden="true"
        viewBox="0 0 960 380"
        className="absolute inset-0 h-full w-full overflow-visible"
        fill="none"
      >
        {FEEDS.map((d) => (
          <g key={d}>
            <path d={d} stroke="rgba(167,139,250,0.22)" strokeWidth="10" strokeLinecap="round" />
            <path d={d} className="landing-trace-pulse" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" />
          </g>
        ))}
        {TRACES.map((trace) => (
          <g key={trace.d}>
            <path d={trace.d} stroke="rgba(167,139,250,0.55)" strokeWidth="1.2" />
            <circle cx={trace.end[0]} cy={trace.end[1]} r="2.6" fill="#c4b5fd" />
          </g>
        ))}
      </svg>

      {STAGES.map((stage, index) => (
        <div
          key={stage.title}
          className="absolute h-[104px] w-[190px]"
          style={CARD_SPOTS[index]}
        >
          <StageCard {...stage} />
        </div>
      ))}

      <div className="absolute left-[620px] top-[100px] h-[180px] w-[180px]">
        <Chip />
      </div>
    </FadeUp>

    {/* Smaller screens: simple grid, chip underneath */}
    <div className="mx-auto mt-12 max-w-md lg:hidden">
      <div className="grid grid-cols-2 gap-3">
        {STAGES.map((stage, index) => (
          <FadeUp key={stage.title} delay={index * 0.08}>
            <StageCard {...stage} />
          </FadeUp>
        ))}
      </div>
      <div className="mx-auto h-10 w-px bg-linear-to-b from-[#a78bfa]/60 to-[#a78bfa]" />
      <FadeUp className="mx-auto h-32 w-32">
        <Chip />
      </FadeUp>
    </div>
  </section>
);

export default Pipeline;
