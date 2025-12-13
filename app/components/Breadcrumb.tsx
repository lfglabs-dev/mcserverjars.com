import Link from "next/link";
import { RiArrowRightSLine } from "@remixicon/react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center gap-1 text-sm text-[var(--text-muted)]">
        <li>
          <Link
            href="/"
            className="hover:text-[var(--foreground)] transition-colors"
          >
            Home
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-1">
            <RiArrowRightSLine className="h-4 w-4 text-[var(--text-subtle)]" />
            {item.href ? (
              <Link
                href={item.href}
                className="hover:text-[var(--foreground)] transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-[var(--foreground)]">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
