"use client";

import { useState } from "react";
import {
  RiAlertFill,
  RiSparklingFill,
  RiBugFill,
  RiCodeFill,
  RiFolder3Fill,
  RiLightbulbFill,
  RiExternalLinkLine,
} from "@remixicon/react";

interface Changelog {
  version: string;
  project: string;
  summary: string;
  breaking_changes: string[];
  new_features: string[];
  bug_fixes: string[];
  api_changes: string[];
  resource_format_changes: string[];
  developer_notes: string[];
  official_changelog_url: string | null;
  generated_at: string;
}

interface Props {
  versions: string[];
  byVersion: Record<string, Record<string, Changelog>>;
}

// Project display order: vanilla first, then spigot, then paper
const projectOrder = ["vanilla", "spigot", "paper"];
const projectMeta: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  vanilla: {
    label: "Minecraft",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
  },
  spigot: {
    label: "Spigot",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
  },
  paper: {
    label: "Paper",
    color: "text-sky-400",
    bgColor: "bg-sky-500/10",
    borderColor: "border-sky-500/30",
  },
};

export function ChangelogTimeline({ versions, byVersion }: Props) {
  const [expandedVersion, setExpandedVersion] = useState<string | null>(
    versions[0] || null
  );

  if (versions.length === 0) {
    return (
      <div className="text-center py-20 text-[var(--text-muted)]">
        <p className="text-lg">No changelogs available yet.</p>
        <p className="text-sm mt-2">Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {versions.map((version, idx) => {
        const logs = byVersion[version] || {};
        const isExpanded = expandedVersion === version;
        const availableProjects = projectOrder.filter((p) => logs[p]);

        return (
          <div
            key={version}
            className={`rounded-2xl border transition-all duration-300 ${
              isExpanded
                ? "border-violet-500/40 bg-gradient-to-b from-violet-500/5 to-transparent"
                : "border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--border-default)]"
            }`}
          >
            {/* Version Header */}
            <button
              onClick={() => setExpandedVersion(isExpanded ? null : version)}
              className="w-full flex items-center gap-4 p-5 text-left"
            >
              {/* Version Number */}
              <div className="flex-shrink-0">
                <span className={`text-2xl font-black tabular-nums ${isExpanded ? "text-violet-400" : ""}`}>
                  {version}
                </span>
              </div>

              {/* Project Pills */}
              <div className="flex gap-2 flex-wrap flex-1">
                {availableProjects.map((project) => {
                  const meta = projectMeta[project];
                  return (
                    <span
                      key={project}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${meta.bgColor} ${meta.color} border ${meta.borderColor}`}
                    >
                      {meta.label}
                    </span>
                  );
                })}
              </div>

              {/* Expand Icon */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isExpanded
                    ? "bg-violet-500/20 rotate-180"
                    : "bg-[var(--bg-subtle)]"
                }`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="px-5 pb-6">
                <div className="space-y-8">
                  {availableProjects.map((project) => {
                    const log = logs[project];
                    if (!log) return null;
                    const meta = projectMeta[project];
                    const hasContent = 
                      log.breaking_changes?.length > 0 ||
                      log.new_features?.length > 0 ||
                      log.api_changes?.length > 0 ||
                      log.resource_format_changes?.length > 0 ||
                      log.bug_fixes?.length > 0 ||
                      log.developer_notes?.length > 0;

                    return (
                      <div key={project} className="relative">
                        {/* Project Header */}
                        <div className={`flex items-center gap-3 mb-4 pb-3 border-b ${meta.borderColor}`}>
                          <div className={`w-1.5 h-8 rounded-full ${meta.bgColor.replace('/10', '/50')}`} />
                          <h3 className={`text-lg font-bold ${meta.color}`}>
                            {meta.label}
                          </h3>
                          {log.official_changelog_url && project === "vanilla" && (
                            <a
                              href={log.official_changelog_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-auto flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-violet-400 transition-colors"
                            >
                              Official changelog
                              <RiExternalLinkLine className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        {/* Summary */}
                        {log.summary && hasContent && (
                          <p className="text-sm text-[var(--text-muted)] mb-5 leading-relaxed">
                            {log.summary}
                          </p>
                        )}

                        {/* No detailed content message */}
                        {!hasContent && (
                          <p className="text-sm text-[var(--text-muted)] italic">
                            No detailed changes documented for this version.
                            {project === "vanilla" && log.official_changelog_url && (
                              <> Check the <a href={log.official_changelog_url} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">official changelog</a> for details.</>
                            )}
                          </p>
                        )}

                        {/* Change Sections */}
                        {hasContent && (
                          <div className="grid gap-4 md:grid-cols-2">
                            <ChangeSection
                              icon={RiAlertFill}
                              title="Breaking Changes"
                              items={log.breaking_changes}
                              accentColor="text-red-400"
                              bgColor="bg-red-500/10"
                            />
                            <ChangeSection
                              icon={RiCodeFill}
                              title="API Changes"
                              items={log.api_changes}
                              accentColor="text-blue-400"
                              bgColor="bg-blue-500/10"
                            />
                            <ChangeSection
                              icon={RiSparklingFill}
                              title="New Features"
                              items={log.new_features}
                              accentColor="text-emerald-400"
                              bgColor="bg-emerald-500/10"
                            />
                            <ChangeSection
                              icon={RiFolder3Fill}
                              title="Resource Changes"
                              items={log.resource_format_changes}
                              accentColor="text-purple-400"
                              bgColor="bg-purple-500/10"
                            />
                            <ChangeSection
                              icon={RiBugFill}
                              title="Bug Fixes"
                              items={log.bug_fixes}
                              accentColor="text-amber-400"
                              bgColor="bg-amber-500/10"
                            />
                            <ChangeSection
                              icon={RiLightbulbFill}
                              title="Developer Notes"
                              items={log.developer_notes}
                              accentColor="text-cyan-400"
                              bgColor="bg-cyan-500/10"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface ChangeSectionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: string[];
  accentColor: string;
  bgColor: string;
}

function ChangeSection({ icon: Icon, title, items, accentColor, bgColor }: ChangeSectionProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className={`p-4 rounded-xl ${bgColor} border border-white/5`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${accentColor}`} />
        <h4 className={`text-sm font-semibold ${accentColor}`}>{title}</h4>
        <span className="ml-auto text-xs text-white/40 font-mono">{items.length}</span>
      </div>
      <ul className="space-y-1.5">
        {items.slice(0, 5).map((item, i) => (
          <li key={i} className="text-xs text-[var(--text-muted)] leading-relaxed pl-3 relative before:absolute before:left-0 before:top-[0.5em] before:w-1 before:h-1 before:rounded-full before:bg-current before:opacity-40">
            {item}
          </li>
        ))}
        {items.length > 5 && (
          <li className="text-xs text-white/30 pl-3">
            +{items.length - 5} more...
          </li>
        )}
      </ul>
    </div>
  );
}

