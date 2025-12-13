"use client";

import { useState, useMemo, useCallback } from "react";
import { RiFileCopyLine, RiCheckLine, RiArrowRightLine } from "@remixicon/react";

interface NmsMapping {
  minecraft_version: string;
  nms_revision: string;
  craftbukkit_package: string;
  spigot_version: string;
  is_latest_for_revision: boolean;
}

interface Props {
  byVersion: Record<string, string>;
  byRevision: Record<string, string[]>;
  groupedMappings: Record<string, NmsMapping[]>;
}

export function NmsLookup({ byVersion, byRevision, groupedMappings }: Props) {
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
  }, []);

  // Detect if query looks like a version or revision
  const result = useMemo(() => {
    const q = query.trim();
    if (!q) return null;

    // Check if it's an NMS revision (starts with v)
    if (q.toLowerCase().startsWith("v")) {
      const normalizedQuery = q.toLowerCase().replace(/[._-]/g, "_");
      for (const revision of Object.keys(byRevision)) {
        if (revision.toLowerCase() === normalizedQuery) {
          return {
            type: "revision" as const,
            revision,
            versions: byRevision[revision],
          };
        }
      }
    }

    // Check if it's a Minecraft version
    const normalizedVersion = q.replace(/[_-]/g, ".");
    if (byVersion[normalizedVersion]) {
      return {
        type: "version" as const,
        version: normalizedVersion,
        revision: byVersion[normalizedVersion],
      };
    }

    // Partial match for versions
    for (const version of Object.keys(byVersion)) {
      if (version.includes(q) || q.includes(version)) {
        return {
          type: "version" as const,
          version,
          revision: byVersion[version],
        };
      }
    }

    return { type: "notfound" as const };
  }, [query, byVersion, byRevision]);

  const revisionList = Object.entries(groupedMappings);

  return (
    <div className="space-y-8">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a version (1.21.4) or revision (v1_21_R4)"
          className="w-full px-6 py-4 text-lg rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg-card)] focus:border-emerald-500 focus:outline-none transition-colors placeholder:text-[var(--text-muted)]/50"
          autoComplete="off"
          spellCheck={false}
        />
        
        {/* Result Display */}
        {result && result.type !== "notfound" && (
          <div className="absolute left-0 right-0 top-full mt-3 p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-xl shadow-black/5 animate-in fade-in slide-in-from-top-2 duration-200">
            {result.type === "version" ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[var(--text-muted)]">{result.version}</span>
                  <RiArrowRightLine className="w-4 h-4 text-[var(--text-muted)]" />
                  <button
                    onClick={() => copyToClipboard(result.revision)}
                    className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
                  >
                    <code className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                      {result.revision}
                    </code>
                    {copied === result.revision ? (
                      <RiCheckLine className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <RiFileCopyLine className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                </div>
                <button
                  onClick={() => copyToClipboard(`org.bukkit.craftbukkit.${result.revision}`)}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  {copied === `org.bukkit.craftbukkit.${result.revision}` ? "Copied!" : "Copy full package"}
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <code className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                    {result.revision}
                  </code>
                  <span className="text-[var(--text-muted)]">→</span>
                  <span className="text-sm text-[var(--text-muted)]">
                    {result.versions.length} version{result.versions.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.versions.map((v) => (
                    <button
                      key={v}
                      onClick={() => copyToClipboard(v)}
                      className="px-2.5 py-1 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-card)] text-sm font-mono transition-colors"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {result?.type === "notfound" && query.trim() && (
          <div className="absolute left-0 right-0 top-full mt-3 p-4 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-xl shadow-black/5">
            <p className="text-[var(--text-muted)]">
              No mapping found for &quot;{query}&quot;
            </p>
          </div>
        )}
      </div>

      {/* All Mappings - Compact Grid */}
      <div className="pt-8">
        <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">
          All Mappings
        </h2>
        
        <div className="space-y-3">
          {revisionList.map(([revision, mappings]) => (
            <div
              key={revision}
              className="group flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-emerald-500/30 transition-colors"
            >
              <button
                onClick={() => copyToClipboard(revision)}
                className="flex items-center gap-2 shrink-0"
              >
                <code className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                  {revision}
                </code>
                {copied === revision ? (
                  <RiCheckLine className="w-4 h-4 text-emerald-500" />
                ) : (
                  <RiFileCopyLine className="w-4 h-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
              
              <div className="flex flex-wrap gap-1.5">
                {mappings
                  .sort((a, b) => {
                    const aParts = a.minecraft_version.split(".").map(Number);
                    const bParts = b.minecraft_version.split(".").map(Number);
                    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
                      const diff = (bParts[i] || 0) - (aParts[i] || 0);
                      if (diff !== 0) return diff;
                    }
                    return 0;
                  })
                  .map((m) => (
                    <button
                      key={m.minecraft_version}
                      onClick={() => copyToClipboard(m.minecraft_version)}
                      className="px-2 py-0.5 rounded-md text-sm font-mono text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--bg-subtle)] transition-colors"
                    >
                      {m.minecraft_version}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

