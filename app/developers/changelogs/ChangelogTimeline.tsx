"use client";

import { useState } from "react";
import {
  RiAlertLine,
  RiAddLine,
  RiBugLine,
  RiCodeLine,
  RiFolder3Line,
  RiLightbulbLine,
  RiExternalLinkLine,
  RiArrowRightSLine,
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
const projectLabels: Record<string, string> = {
  vanilla: "Minecraft",
  spigot: "Spigot",
  paper: "Paper",
};

export function ChangelogTimeline({ versions, byVersion }: Props) {
  const [expandedVersion, setExpandedVersion] = useState<string | null>(
    versions[0] || null
  );
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set(["vanilla"]) // Default expand vanilla
  );

  const toggleProject = (version: string, project: string) => {
    const key = `${version}-${project}`;
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const isProjectExpanded = (version: string, project: string) => {
    return expandedProjects.has(`${version}-${project}`);
  };

  if (versions.length === 0) {
    return (
      <div className="text-center py-20 text-[var(--text-muted)]">
        <p className="text-lg">No changelogs available yet.</p>
        <p className="text-sm mt-2">Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {versions.map((version) => {
        const logs = byVersion[version] || {};
        const isExpanded = expandedVersion === version;
        const availableProjects = projectOrder.filter((p) => logs[p]);

        return (
          <div
            key={version}
            className={`rounded-xl border transition-all ${
              isExpanded
                ? "border-[var(--border-default)] bg-[var(--bg-card)]"
                : "border-[var(--border-subtle)] bg-[var(--bg-card)] hover:border-[var(--border-default)]"
            }`}
          >
            {/* Version Header */}
            <button
              onClick={() => setExpandedVersion(isExpanded ? null : version)}
              className="w-full flex items-center gap-4 p-4 text-left"
            >
              <span className="text-xl font-bold tabular-nums font-mono">
                {version}
              </span>

              <div className="flex gap-1.5 flex-1">
                {availableProjects.map((project) => (
                  <span
                    key={project}
                    className="px-2 py-0.5 rounded text-xs font-medium bg-[var(--bg-subtle)] text-[var(--text-muted)]"
                  >
                    {projectLabels[project]}
                  </span>
                ))}
              </div>

              <svg
                className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${
                  isExpanded ? "rotate-180" : ""
                }`}
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
            </button>

            {/* Expanded Content - Project Sub-accordions */}
            {isExpanded && (
              <div className="px-4 pb-4 space-y-2">
                {availableProjects.map((project) => {
                  const log = logs[project];
                  if (!log) return null;

                  const projectExpanded = isProjectExpanded(version, project);
                  const hasContent =
                    log.breaking_changes?.length > 0 ||
                    log.new_features?.length > 0 ||
                    log.api_changes?.length > 0 ||
                    log.resource_format_changes?.length > 0 ||
                    log.bug_fixes?.length > 0 ||
                    log.developer_notes?.length > 0;

                  // Count total changes for badge
                  const changeCount =
                    (log.breaking_changes?.length || 0) +
                    (log.new_features?.length || 0) +
                    (log.api_changes?.length || 0) +
                    (log.resource_format_changes?.length || 0) +
                    (log.bug_fixes?.length || 0) +
                    (log.developer_notes?.length || 0);

                  return (
                    <div
                      key={project}
                      className={`rounded-lg border transition-all ${
                        projectExpanded
                          ? "border-[var(--border-default)] bg-[var(--bg-subtle)]"
                          : "border-transparent bg-[var(--bg-subtle)] hover:border-[var(--border-subtle)]"
                      }`}
                    >
                      {/* Project Header - Clickable */}
                      <button
                        onClick={() => toggleProject(version, project)}
                        className="w-full flex items-center gap-3 p-3 text-left"
                      >
                        <RiArrowRightSLine
                          className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${
                            projectExpanded ? "rotate-90" : ""
                          }`}
                        />
                        <span className="text-sm font-semibold text-[var(--text-primary)]">
                          {projectLabels[project]}
                        </span>

                        {/* Change count badge */}
                        {changeCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--bg-card)] text-[var(--text-muted)]">
                            {changeCount} changes
                          </span>
                        )}

                        {/* Breaking changes warning */}
                        {log.breaking_changes?.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400 flex items-center gap-1">
                            <RiAlertLine className="w-3 h-3" />
                            {log.breaking_changes.length} breaking
                          </span>
                        )}

                        {/* Official link */}
                        {log.official_changelog_url &&
                          project === "vanilla" && (
                            <a
                              href={log.official_changelog_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="ml-auto flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                            >
                              Official
                              <RiExternalLinkLine className="w-3 h-3" />
                            </a>
                          )}
                      </button>

                      {/* Project Content */}
                      {projectExpanded && (
                        <div className="px-3 pb-3 pt-0">
                          {/* Summary */}
                          {log.summary && (
                            <p className="text-sm text-[var(--text-muted)] mb-4 leading-relaxed pl-7">
                              {log.summary}
                            </p>
                          )}

                          {/* Change Sections */}
                          {hasContent && (
                            <div className="space-y-3 pl-7">
                              <ChangeSection
                                icon={RiAlertLine}
                                title="Breaking Changes"
                                items={log.breaking_changes}
                                isWarning
                              />
                              <ChangeSection
                                icon={RiCodeLine}
                                title="API Changes"
                                items={log.api_changes}
                              />
                              <ChangeSection
                                icon={RiAddLine}
                                title="New Features"
                                items={log.new_features}
                              />
                              <ChangeSection
                                icon={RiFolder3Line}
                                title="Resource Changes"
                                items={log.resource_format_changes}
                              />
                              <ChangeSection
                                icon={RiBugLine}
                                title="Bug Fixes"
                                items={log.bug_fixes}
                              />
                              <ChangeSection
                                icon={RiLightbulbLine}
                                title="Developer Notes"
                                items={log.developer_notes}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
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
  isWarning?: boolean;
}

function ChangeSection({
  icon: Icon,
  title,
  items,
  isWarning,
}: ChangeSectionProps) {
  if (!items || items.length === 0) return null;

  return (
    <div
      className={`p-3 rounded-lg ${
        isWarning
          ? "bg-red-500/5 border border-red-500/10"
          : "bg-[var(--bg-subtle)]"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon
          className={`w-3.5 h-3.5 ${
            isWarning ? "text-red-400" : "text-[var(--text-muted)]"
          }`}
        />
        <h4
          className={`text-xs font-semibold uppercase tracking-wide ${
            isWarning ? "text-red-400" : "text-[var(--text-muted)]"
          }`}
        >
          {title}
        </h4>
        <span className="ml-auto text-xs text-[var(--text-muted)] opacity-50 font-mono">
          {items.length}
        </span>
      </div>
      <ul className="space-y-1">
        {items.slice(0, 6).map((item, i) => (
          <li
            key={i}
            className="text-xs text-[var(--text-secondary)] leading-relaxed pl-3 relative before:absolute before:left-0 before:top-[0.55em] before:w-1 before:h-1 before:rounded-full before:bg-current before:opacity-30"
          >
            {item}
          </li>
        ))}
        {items.length > 6 && (
          <li className="text-xs text-[var(--text-muted)] opacity-50 pl-3">
            +{items.length - 6} more
          </li>
        )}
      </ul>
    </div>
  );
}
