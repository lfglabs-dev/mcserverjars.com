import Link from "next/link";
import type { MinecraftVersion } from "@/lib/database.types";
import { formatDate } from "@/lib/utils";
import { RiDownloadLine, RiArrowRightSLine } from "@remixicon/react";

interface VersionTableProps {
  projectSlug: string;
  versions: MinecraftVersion[];
  latestVersion?: string;
}

export function VersionTable({
  projectSlug,
  versions,
  latestVersion,
}: VersionTableProps) {
  if (versions.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-8 text-center">
        <p className="text-[var(--text-muted)]">
          No versions available yet. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] overflow-hidden">
      <div className="divide-y divide-[var(--border-subtle)]">
        {versions.map((version) => {
          const isLatest = version.version === latestVersion;
          return (
            <div
              key={version.id}
              className="flex items-center gap-4 px-4 py-3 table-row-hover"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium">
                    {version.version}
                  </span>
                  {isLatest && (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      Latest
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-[var(--text-subtle)]">
                  {formatDate(version.release_date)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/${projectSlug}/${version.version}`}
                  className="inline-flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] transition-colors"
                >
                  Builds
                  <RiArrowRightSLine className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href={`/${projectSlug}/${version.version}/latest`}
                  className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors"
                >
                  <RiDownloadLine className="h-3.5 w-3.5" />
                  Download
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
