import { FileCode2, FileText, FileType2, NotebookText } from "lucide-react";
import FadeUp from "./FadeUp";

/*
  Where the reference shows customer logos. Indoq has none to show
  yet, so the strip lists the file types it reads instead.
*/
const FORMATS = [
  { icon: FileText, label: "PDF" },
  { icon: FileType2, label: "Word" },
  { icon: NotebookText, label: "Plain text" },
  { icon: FileCode2, label: "Markdown" },
];

const FormatStrip = () => (
  <FadeUp className="relative mx-auto max-w-5xl px-4 py-12">
    <p className="mb-6 text-center text-xs uppercase tracking-[0.2em] text-white/40">
      Reads the files you already have
    </p>
    <ul className="grid grid-cols-2 gap-y-6 sm:grid-cols-4">
      {FORMATS.map(({ icon: Icon, label }) => (
        <li
          key={label}
          className="flex items-center justify-center gap-2.5 font-display text-lg font-bold text-white/80 sm:text-xl"
        >
          <Icon className="h-6 w-6 text-[#b794f6]" strokeWidth={1.75} />
          {label}
        </li>
      ))}
    </ul>
  </FadeUp>
);

export default FormatStrip;
