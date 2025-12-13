import Link from "next/link";
import { RiHome4Line, RiSearchLine } from "@remixicon/react";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-primary">404</p>
        <h1 className="mt-4 text-2xl font-semibold">Page Not Found</h1>
        <p className="mt-2 text-[var(--text-muted)]">
          The jar you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
          >
            <RiHome4Line className="h-4 w-4" />
            Go Home
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)] transition-colors"
          >
            <RiSearchLine className="h-4 w-4" />
            Browse Jars
          </Link>
        </div>
      </div>
    </div>
  );
}

