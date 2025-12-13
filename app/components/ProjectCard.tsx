import Link from "next/link";
import type { JarProject } from "@/lib/database.types";
import { RiArrowRightSLine } from "@remixicon/react";
import { CategoryIcon } from "./CategoryIcon";

interface ProjectCardProps {
  project: JarProject;
  stats?: {
    versionCount: number;
    buildCount: number;
    latestVersion: string | null;
  };
}

export function ProjectCard({ project, stats }: ProjectCardProps) {
  return (
    <Link
      href={`/${project.slug}`}
      className="group flex items-center gap-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3.5 transition-all duration-150 hover:border-primary/40 hover:bg-primary/[0.02]"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-subtle)] text-[var(--text-muted)] group-hover:bg-primary/10 group-hover:text-primary transition-colors">
        <CategoryIcon category={project.category} className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-[var(--foreground)] truncate">
            {project.name}
          </h3>
          {stats?.latestVersion && (
            <span className="shrink-0 rounded bg-[var(--bg-subtle)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">
              {stats.latestVersion}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-[var(--text-muted)] truncate">
          {project.description}
        </p>
      </div>

      <RiArrowRightSLine className="h-5 w-5 shrink-0 text-[var(--text-subtle)] group-hover:text-primary transition-colors" />
    </Link>
  );
}
