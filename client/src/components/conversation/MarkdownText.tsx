"use client";

import React, { memo, useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Citation } from "@/types/conversation";
import { rehypeCitations } from "@/lib/rehypeCitations";
import { cn } from "@/lib/utils";
import { CitationBadge } from "./CitationBadge";

const REMARK_PLUGINS = [remarkGfm];
const REHYPE_PLUGINS = [rehypeCitations];

/*
  Element styles for answers. Raw HTML in the source is never rendered,
  which is the react-markdown default and must stay that way because
  model output is untrusted.
*/
const BASE_COMPONENTS: Components = {
  p: ({ children }) => <p className="leading-relaxed">{children}</p>,
  h1: ({ children }) => (
    <h3 className="font-display font-bold text-base pt-1">{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className="font-display font-bold text-base pt-1">{children}</h3>
  ),
  h3: ({ children }) => (
    <h4 className="font-semibold text-sm pt-1">{children}</h4>
  ),
  h4: ({ children }) => (
    <h5 className="font-semibold text-sm pt-1">{children}</h5>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-text-primary">{children}</strong>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-5 space-y-1.5 marker:text-text-disabled">
      {children}
    </ul>
  ),
  ol: ({ children, start }) => (
    <ol
      start={start}
      className="list-decimal pl-5 space-y-1.5 marker:text-text-secondary"
    >
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed pl-0.5 [&>ul]:mt-1.5 [&>ol]:mt-1.5">
      {children}
    </li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-border-strong pl-3 text-text-secondary">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-border" />,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="text-accent underline underline-offset-2 hover:text-accent-hover transition-colors"
    >
      {children}
    </a>
  ),
  /*
    Images are never loaded. Text hidden in an uploaded document could
    make the model emit an image URL that carries private content to
    another server as soon as it renders.
  */
  img: ({ alt }) => (
    <span className="text-text-secondary">{alt ? `[Image: ${alt}]` : ""}</span>
  ),
  code: ({ children, className }) => (
    <code
      className={cn(
        "font-mono text-[0.85em] px-1 py-0.5 rounded bg-surface-raised",
        className
      )}
    >
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded-md border border-border bg-surface-raised p-3 text-xs leading-relaxed [&_code]:bg-transparent [&_code]:p-0">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-xs text-left border-collapse">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 font-semibold bg-surface-raised border-b border-border">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 align-top border-b border-border">{children}</td>
  ),
};

interface MarkdownTextProps {
  content: string;
  citations: Citation[];
  onSelectCitation?: (citation: Citation) => void;
  showCaret?: boolean;
}

/*
  Renders one text segment of an answer as markdown. Memoized so
  finished messages do not parse again while a new one streams.
*/
const MarkdownTextBase = ({
  content,
  citations,
  onSelectCitation,
  showCaret = false,
}: MarkdownTextProps) => {
  const components = useMemo<Components>(
    () => ({
      ...BASE_COMPONENTS,
      cite: ({ node, children }) => {
        const docNumber = Number(node?.properties.dataDoc);
        // Match by number, the list only holds sources the answer cited
        const citation = citations.find((c) => c.index === docNumber);

        if (citation && onSelectCitation) {
          return <CitationBadge citation={citation} onClick={onSelectCitation} />;
        }

        // Sources arrive when the stream ends, hold their place until then
        return (
          <span className="inline-flex mx-0.5 px-1.5 py-0.5 rounded font-mono text-xs text-text-disabled bg-surface-raised border border-border">
            {children}
          </span>
        );
      },
    }),
    [citations, onSelectCitation]
  );

  return (
    <div className={cn("space-y-3 wrap-break-word", showCaret && "stream-caret")}>
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export const MarkdownText = memo(MarkdownTextBase);
