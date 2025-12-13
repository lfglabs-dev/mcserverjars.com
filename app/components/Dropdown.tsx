"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { RiArrowDownSLine } from "@remixicon/react";
import { cx } from "@/lib/utils";

interface DropdownItem {
  label: string;
  href: string;
  description?: string;
}

interface DropdownProps {
  label: string;
  items: DropdownItem[];
}

export function Dropdown({ label, items }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cx(
          "flex items-center gap-1 px-3 py-1.5 text-sm transition-colors",
          open
            ? "text-[var(--foreground)]"
            : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
        )}
      >
        {label}
        <RiArrowDownSLine
          className={cx(
            "h-4 w-4 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-56 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-1.5 shadow-lg">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 transition-colors hover:bg-[var(--bg-subtle)]"
            >
              <span className="block text-sm font-medium text-[var(--foreground)]">
                {item.label}
              </span>
              {item.description && (
                <span className="block text-xs text-[var(--text-muted)]">
                  {item.description}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

interface MobileDropdownProps {
  label: string;
  items: DropdownItem[];
  onNavigate: () => void;
}

export function MobileDropdown({ label, items, onNavigate }: MobileDropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-3 py-2 rounded-md text-sm text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--bg-subtle)]"
      >
        {label}
        <RiArrowDownSLine
          className={cx(
            "h-4 w-4 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      
      {open && (
        <div className="ml-3 mt-1 space-y-0.5 border-l border-[var(--border-subtle)] pl-3">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className="block rounded-md px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--bg-subtle)]"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

