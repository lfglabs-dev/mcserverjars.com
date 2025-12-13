import { siteConfig } from "@/app/siteConfig";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[var(--border-subtle)] py-6 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
        <span>{siteConfig.name}</span>
        <div className="flex items-center gap-4">
          <Link
            href="https://github.com/oraxen"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--foreground)] transition-colors"
          >
            GitHub
          </Link>
          <span>·</span>
          <a
            href="https://thomas.md/"
            className="hover:text-[var(--foreground)] transition-colors"
          >
            © {new Date().getFullYear()} Thomas Marchand
          </a>
        </div>
      </div>
    </footer>
  );
}
