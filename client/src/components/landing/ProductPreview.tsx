import { FileText, MessageSquare, Search } from "lucide-react";

/*
  A drawn copy of the Indoq workspace, not a screenshot, so it stays
  sharp at every size and follows the brand colours. The documents and
  the answer are illustrative examples.
*/

const DOCUMENTS = [
  { name: "Lease agreement.pdf", pages: "12 pages" },
  { name: "Q3 board report.pdf", pages: "34 pages" },
  { name: "Onboarding notes.md", pages: "3 pages" },
];

const Citation = ({ n, active = false }: { n: number; active?: boolean }) => (
  <span
    className={
      active
        ? "mx-0.5 inline-flex items-center rounded-md bg-[#8b5cf6] px-1.5 py-px align-middle text-[10px] font-medium text-white"
        : "mx-0.5 inline-flex items-center rounded-md bg-white/10 px-1.5 py-px align-middle text-[10px] font-medium text-white/80"
    }
  >
    Doc {n}
  </span>
);

const ProductPreview = () => (
  <div className="landing-panel overflow-hidden rounded-2xl text-left">
    {/* Window bar */}
    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
      <span className="font-display text-sm font-bold text-white">Indoq</span>
      <div className="hidden items-center gap-1 rounded-full bg-white/5 p-1 text-[11px] sm:flex">
        <span className="rounded-full bg-white/10 px-3 py-1 text-white">Chat</span>
        <span className="px-3 py-1 text-white/50">Documents</span>
        <span className="px-3 py-1 text-white/50">Diagrams</span>
      </div>
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-white/60">
        <Search className="h-3.5 w-3.5" />
      </span>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] lg:grid-cols-[210px_1fr_240px]">
      {/* Documents */}
      <aside className="hidden border-r border-white/10 p-4 sm:block">
        <p className="mb-3 text-[11px] uppercase tracking-wider text-white/40">
          Research workspace
        </p>
        <ul className="space-y-2">
          {DOCUMENTS.map((doc) => (
            <li key={doc.name} className="rounded-lg bg-white/4 p-2.5">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 shrink-0 text-[#b794f6]" />
                <span className="truncate text-[11px] text-white/90">{doc.name}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between pl-5">
                <span className="text-[10px] text-white/40">{doc.pages}</span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Ready
                </span>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      {/* Conversation */}
      <div className="space-y-4 p-4 sm:p-5">
        <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-[#6f2da8] px-3.5 py-2 text-xs text-white">
          How much notice do we need to give to end the lease?
        </div>
        <div className="max-w-[95%] space-y-2 text-xs leading-relaxed text-white/80">
          <p>
            Either party can end the lease with{" "}
            <strong className="text-white">60 days written notice</strong>
            <Citation n={1} active />. Notice has to be sent to the address in clause 14
            <Citation n={2} />.
          </p>
          <p>
            Ending it in the first year also costs one month of rent
            <Citation n={3} />.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/3 px-3.5 py-2 text-[11px] text-white/40">
          <MessageSquare className="h-3.5 w-3.5" />
          Ask about your documents
        </div>
      </div>

      {/* Source inspector */}
      <aside className="hidden border-l border-white/10 p-4 lg:block">
        <p className="mb-3 text-[11px] uppercase tracking-wider text-white/40">Source</p>
        <div className="rounded-xl bg-linear-to-br from-[#6f2da8] to-[#4c1d95] p-3.5">
          <p className="text-[11px] font-medium text-white">Lease agreement.pdf</p>
          <p className="mt-0.5 text-[10px] text-white/60">Page 7 · Termination</p>
          <p className="mt-3 text-[11px] leading-relaxed text-white/90">
            &ldquo;Either the Landlord or the Tenant may terminate this agreement by giving not
            less than sixty (60) days written notice to the other party.&rdquo;
          </p>
        </div>
      </aside>
    </div>
  </div>
);

export default ProductPreview;
