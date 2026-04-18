"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

const components: Components = {
  h1: ({ children }) => (
    <h1 className="mt-0 text-xl font-semibold tracking-tight text-foreground">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-6 text-lg font-semibold tracking-tight text-foreground first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-4 text-base font-semibold text-foreground">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-[0.9375rem] leading-relaxed text-muted-foreground">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="my-2 list-inside list-disc space-y-1 text-[0.9375rem] text-muted-foreground">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 list-inside list-decimal space-y-1 text-[0.9375rem] text-muted-foreground">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="font-medium text-primary underline underline-offset-4 hover:text-primary/90"
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-primary/50 pl-4 text-muted-foreground italic">
      {children}
    </blockquote>
  ),
  code(props) {
    const { children, className } = props;
    const inline = !className?.includes("language-");
    if (inline) {
      return (
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.8125rem] text-foreground">
          {children}
        </code>
      );
    }
    const match = /language-(\w+)/.exec(className ?? "");
    const lang = match?.[1] ?? "text";
    return (
      <SyntaxHighlighter
        language={lang}
        style={oneDark}
        PreTag="div"
        className="rounded-xl !bg-zinc-950 text-[0.8125rem] !p-4 shadow-[inset_0_1px_0_0_oklch(1_0_0/8%)] ring-1 ring-inset ring-white/[0.06]"
      >
        {String(children).replace(/\n$/, "")}
      </SyntaxHighlighter>
    );
  },
  pre: ({ children }) => <>{children}</>,
};

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
