"use client";

import { useState } from "react";
import { RiFileCopyLine, RiCheckLine } from "@remixicon/react";
import { cx } from "@/lib/utils";

interface CodeBlockProps {
  children: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
}

export function CodeBlock({
  children,
  language,
  filename,
  showLineNumbers = false,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = children.trim().split("\n");

  return (
    <div className="group relative my-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] overflow-hidden">
      {/* Header */}
      {(filename || language) && (
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-2 bg-[var(--bg-elevated)]">
          <span className="text-xs text-[var(--text-muted)] font-mono">
            {filename || language}
          </span>
        </div>
      )}

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className={cx(
          "absolute right-2 top-2 p-2 rounded-md transition-all",
          "opacity-0 group-hover:opacity-100",
          "bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)]",
          "text-[var(--text-muted)] hover:text-[var(--foreground)]",
          filename || language ? "top-12" : "top-2"
        )}
        title="Copy to clipboard"
      >
        {copied ? (
          <RiCheckLine className="h-4 w-4 text-emerald-500" />
        ) : (
          <RiFileCopyLine className="h-4 w-4" />
        )}
      </button>

      {/* Code content */}
      <div className="overflow-x-auto p-4">
        <pre className="text-sm font-mono leading-relaxed">
          <code>
            {showLineNumbers ? (
              lines.map((line, i) => (
                <div key={i} className="flex">
                  <span className="select-none pr-4 text-[var(--text-subtle)] w-8 text-right">
                    {i + 1}
                  </span>
                  <span>{line}</span>
                </div>
              ))
            ) : (
              children.trim()
            )}
          </code>
        </pre>
      </div>
    </div>
  );
}
