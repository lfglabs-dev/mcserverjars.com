import Link from "next/link";
import type { JarBuildWithVersion } from "@/lib/database.types";
import { formatDate, formatBytes } from "@/lib/utils";
import { RiDownloadLine } from "@remixicon/react";

interface BuildTableProps {
  builds: JarBuildWithVersion[];
}

export function BuildTable({ builds }: BuildTableProps) {
  if (builds.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-8 text-center">
        <p className="text-[var(--text-muted)]">
          No builds available for this version yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] overflow-hidden">
      <div className="divide-y divide-[var(--border-subtle)]">
        {builds.map((build) => (
          <div
            key={build.id}
            className="flex items-center gap-4 px-4 py-3 table-row-hover"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium">
                  #{build.build_number || "—"}
                </span>
                {build.is_latest_for_mc_version && (
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    Latest
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-3 text-xs text-[var(--text-subtle)]">
                <span>{formatDate(build.release_date)}</span>
                {build.file_size && <span>{formatBytes(build.file_size)}</span>}
                {build.sha256 && (
                  <span className="font-mono truncate max-w-[100px]" title={build.sha256}>
                    {build.sha256.substring(0, 8)}…
                  </span>
                )}
              </div>
            </div>

            <Link
              href={build.download_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors"
            >
              <RiDownloadLine className="h-3.5 w-3.5" />
              Download
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
