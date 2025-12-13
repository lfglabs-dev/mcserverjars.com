"use client";

import { siteConfig } from "@/app/siteConfig";
import Link from "next/link";
import { RiCloseLine, RiMenuLine, RiGithubFill } from "@remixicon/react";
import { useState, useEffect } from "react";
import { cx } from "@/lib/utils";

export function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const handler = () => setOpen(false);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <header
      className={cx(
        "fixed inset-x-0 top-0 z-50 transition-all duration-200",
        scrolled || open
          ? "bg-[var(--bg-elevated)]/95 backdrop-blur-sm border-b border-[var(--border-subtle)]"
          : "bg-transparent"
      )}
    >
      <nav className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between">
          <Link
            href="/"
            className="text-sm font-semibold text-[var(--foreground)]"
          >
            {siteConfig.name}
          </Link>

          <div className="hidden sm:flex items-center gap-1">
            <NavLink href="/">All</NavLink>
            <NavLink href="/paper">Paper</NavLink>
            <NavLink href="/spigot">Spigot</NavLink>
            <NavLink href="/vanilla">Vanilla</NavLink>
            <a
              href="https://github.com/oraxen"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 p-2 rounded-md text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--bg-subtle)] transition-colors"
              aria-label="GitHub"
            >
              <RiGithubFill className="h-4 w-4" />
            </a>
          </div>

          <button
            onClick={() => setOpen(!open)}
            className="sm:hidden p-2 rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"
            aria-label="Toggle menu"
          >
            {open ? (
              <RiCloseLine className="h-5 w-5" />
            ) : (
              <RiMenuLine className="h-5 w-5" />
            )}
          </button>
        </div>

        {open && (
          <div className="sm:hidden pb-4 space-y-1">
            <MobileNavLink href="/" onClick={() => setOpen(false)}>
              All Jars
            </MobileNavLink>
            <MobileNavLink href="/paper" onClick={() => setOpen(false)}>
              Paper
            </MobileNavLink>
            <MobileNavLink href="/spigot" onClick={() => setOpen(false)}>
              Spigot
            </MobileNavLink>
            <MobileNavLink href="/vanilla" onClick={() => setOpen(false)}>
              Vanilla
            </MobileNavLink>
          </div>
        )}
      </nav>
    </header>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
    >
      {children}
    </Link>
  );
}

function MobileNavLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-3 py-2 rounded-md text-sm text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--bg-subtle)]"
    >
      {children}
    </Link>
  );
}
