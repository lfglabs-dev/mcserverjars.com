import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import { CalloutBox, CodeBlock, DownloadButton, StartupFlagsGenerator } from "@/app/components/mdx";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Override default elements
    a: ({ href, children, ...props }) => {
      if (href?.startsWith("/")) {
        return (
          <Link href={href} className="text-primary hover:underline" {...props}>
            {children}
          </Link>
        );
      }
      if (href?.startsWith("#")) {
        return (
          <a href={href} className="text-primary hover:underline" {...props}>
            {children}
          </a>
        );
      }
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
          {...props}
        >
          {children}
        </a>
      );
    },

    // Inline code styling
    code: ({ children, className, ...props }) => {
      // If it has a className, it's a code block (handled by pre)
      if (className) {
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      }
      // Otherwise it's inline code
      return (
        <code
          className="rounded bg-[var(--bg-subtle)] px-1.5 py-0.5 text-sm font-mono text-[var(--foreground)]"
          {...props}
        >
          {children}
        </code>
      );
    },

    // Code blocks with copy functionality
    pre: ({ children, ...props }) => {
      // Extract the code content and language from the child code element
      const codeElement = children as React.ReactElement<{
        children: string;
        className?: string;
      }>;
      const code = codeElement?.props?.children || "";
      const className = codeElement?.props?.className || "";
      const language = className.replace("language-", "");

      return <CodeBlock language={language}>{String(code)}</CodeBlock>;
    },

    // Custom components
    CalloutBox,
    DownloadButton,
    StartupFlagsGenerator,

    // Spread any additional components passed in
    ...components,
  };
}
