"use client";

import { useState } from "react";
import {
  RiAlertLine,
  RiSparklingLine,
  RiBugLine,
  RiCodeLine,
  RiFolder3Line,
  RiLightbulbLine,
  RiArrowDownSLine,
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
  byVersion: Record<string, Changelog[]>;
}

const projectColors: Record<string, string> = {
  vanilla: "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30",
  paper: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
  spigot: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
};

const projectLabels: Record<string, string> = {
  vanilla: "Vanilla",
  paper: "Paper",
  spigot: "Spigot",
};

export function ChangelogViewer({ versions, byVersion }: Props) {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(
    new Set(versions.slice(0, 2))
  );

  const projects = ["vanilla", "paper", "spigot"];

  const toggleVersion = (version: string) => {
    const next = new Set(expandedVersions);
    if (next.has(version)) {
      next.delete(version);
    } else {
      next.add(version);
    }
    setExpandedVersions(next);
  };

  const filteredVersions = versions.filter((v) => {
    if (!selectedProject) return true;
    return byVersion[v]?.some((c) => c.project === selectedProject);
  });

  return (
    <div>
      {/* Project Filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setSelectedProject(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            selectedProject === null
              ? "bg-[var(--text-primary)] text-[var(--bg-primary)]"
              : "bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-default)]"
          }`}
        >
          All
        </button>
        {projects.map((project) => (
          <button
            key={project}
            onClick={() => setSelectedProject(project)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedProject === project
                ? "bg-[var(--text-primary)] text-[var(--bg-primary)]"
                : "bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--border-default)]"
            }`}
          >
            {projectLabels[project]}
          </button>
        ))}
      </div>

      {/* Changelog List */}
      <div className="space-y-4">
        {filteredVersions.length === 0 && (
          <div className="text-center py-12 text-[var(--text-muted)]">
            No changelogs available yet.
          </div>
        )}

        {filteredVersions.map((version) => {
          const logs = byVersion[version] || [];
          const filteredLogs = selectedProject
            ? logs.filter((l) => l.project === selectedProject)
            : logs;
          const isExpanded = expandedVersions.has(version);

          return (
            <div
              key={version}
              className="rounded-2xl border border-[var(--border-subtle)] overflow-hidden"
            >
              {/* Version Header */}
              <button
                onClick={() => toggleVersion(version)}
                className="w-full flex items-center justify-between p-4 bg-[var(--bg-card)] hover:bg-[var(--bg-subtle)] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold">{version}</span>
                  <div className="flex gap-1">
                    {logs.map((l) => (
                      <span
                        key={l.project}
                        className={`px-2 py-0.5 rounded text-xs font-medium border ${projectColors[l.project]}`}
                      >
                        {projectLabels[l.project]}
                      </span>
                    ))}
                  </div>
                </div>
                <RiArrowDownSLine
                  className={`h-5 w-5 transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
                  {filteredLogs.map((log) => (
                    <div key={log.project} className="mb-6 last:mb-0">
                      {filteredLogs.length > 1 && (
                        <div className="flex items-center gap-2 mb-3">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium border ${projectColors[log.project]}`}
                          >
                            {projectLabels[log.project]}
                          </span>
                        </div>
                      )}

                      {/* Summary */}
                      <p className="text-sm text-[var(--text-muted)] mb-4">
                        {log.summary}
                      </p>

                      {/* Sections */}
                      <div className="space-y-4">
                        <ChangelogSection
                          icon={RiAlertLine}
                          title="Breaking Changes"
                          items={log.breaking_changes}
                          color="text-red-500"
                          bgColor="bg-red-500/10"
                        />
                        <ChangelogSection
                          icon={RiSparklingLine}
                          title="New Features"
                          items={log.new_features}
                          color="text-emerald-500"
                          bgColor="bg-emerald-500/10"
                        />
                        <ChangelogSection
                          icon={RiCodeLine}
                          title="API Changes"
                          items={log.api_changes}
                          color="text-blue-500"
                          bgColor="bg-blue-500/10"
                        />
                        <ChangelogSection
                          icon={RiFolder3Line}
                          title="Resource Format Changes"
                          items={log.resource_format_changes}
                          color="text-purple-500"
                          bgColor="bg-purple-500/10"
                        />
                        <ChangelogSection
                          icon={RiBugLine}
                          title="Bug Fixes"
                          items={log.bug_fixes}
                          color="text-amber-500"
                          bgColor="bg-amber-500/10"
                        />
                        <ChangelogSection
                          icon={RiLightbulbLine}
                          title="Developer Notes"
                          items={log.developer_notes}
                          color="text-cyan-500"
                          bgColor="bg-cyan-500/10"
                        />
                      </div>

                      {log.official_changelog_url && (
                        <a
                          href={log.official_changelog_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-4 text-xs text-violet-500 hover:underline"
                        >
                          View official Minecraft changelog →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SectionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: string[];
  color: string;
  bgColor: string;
}

function ChangelogSection({ icon: Icon, title, items, color, bgColor }: SectionProps) {
  if (!items || items.length === 0) return null;

  return (
    <div>
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${bgColor} mb-2`}>
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        <span className={`text-xs font-medium ${color}`}>{title}</span>
      </div>
      <ul className="space-y-1 pl-4">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-[var(--text-muted)] list-disc list-outside">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

