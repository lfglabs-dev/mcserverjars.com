import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { ChangelogViewer } from "./ChangelogViewer";

export const revalidate = 300; // 5 minutes

export const metadata: Metadata = {
  title: "Developer Changelogs | Minecraft Server Updates | MCServerJars",
  description:
    "Developer-focused changelogs for Minecraft, Paper, and Spigot. Track breaking changes, API updates, and resource format changes across versions.",
  keywords: [
    "Minecraft changelog",
    "Paper changelog",
    "Spigot changelog",
    "Bukkit API changes",
    "Minecraft breaking changes",
    "plugin update guide",
    "NMS changes",
    "resource pack changes",
    "data pack changes",
  ],
  openGraph: {
    title: "Developer Changelogs | Minecraft Server Updates",
    description:
      "Track breaking changes, API updates, and resource format changes for Minecraft servers.",
    type: "website",
  },
};

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

async function getChangelogs(): Promise<Changelog[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return [];
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from("changelogs")
    .select("*")
    .order("version", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Error fetching changelogs:", error);
    return [];
  }

  return data || [];
}

export default async function ChangelogsPage() {
  const changelogs = await getChangelogs();

  // Group by version
  const byVersion: Record<string, Changelog[]> = {};
  for (const log of changelogs) {
    if (!byVersion[log.version]) {
      byVersion[log.version] = [];
    }
    byVersion[log.version].push(log);
  }

  const versions = Object.keys(byVersion).sort((a, b) => {
    const partsA = a.split(".").map(Number);
    const partsB = b.split(".").map(Number);
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const numA = partsA[i] || 0;
      const numB = partsB[i] || 0;
      if (numA !== numB) return numB - numA;
    }
    return 0;
  });

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-fuchsia-500/5" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-4 pt-16 pb-12 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            Developer Changelogs
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Version Changelogs
          </h1>

          <p className="text-lg text-[var(--text-muted)] max-w-xl mx-auto">
            Developer-focused changelogs highlighting breaking changes, API
            updates, and what you need to know to update your plugins.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-4xl px-4 pb-16 sm:px-6 lg:px-8">
        <ChangelogViewer versions={versions} byVersion={byVersion} />

        {/* API Info */}
        <section className="mt-16 pt-16 border-t border-[var(--border-subtle)]">
          <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-6">
            API Access
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-subtle)] border border-[var(--border-subtle)]">
              <h3 className="font-semibold mb-2">Single Version</h3>
              <code className="text-xs text-violet-600 dark:text-violet-400 break-all">
                GET /api/v1/changelogs/1.21.11
              </code>
              <p className="text-xs text-[var(--text-muted)] mt-2">
                Get changelogs for a specific version
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-subtle)] border border-[var(--border-subtle)]">
              <h3 className="font-semibold mb-2">Version Range</h3>
              <code className="text-xs text-violet-600 dark:text-violet-400 break-all">
                GET /api/v1/changelogs/range?from=1.21.9&to=1.21.11
              </code>
              <p className="text-xs text-[var(--text-muted)] mt-2">
                Get aggregated changes between versions
              </p>
            </div>
          </div>

          <p className="text-sm text-[var(--text-muted)] mt-4">
            Use the <code className="text-violet-500">?project=paper</code>{" "}
            parameter to filter by project (vanilla, paper, spigot).
          </p>
        </section>

        {/* LLM Note */}
        <section className="mt-8">
          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
            <h3 className="font-semibold mb-2 text-amber-600 dark:text-amber-400">
              🤖 For LLMs & Automation
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
              These changelogs are optimized for LLM consumption. Use the range
              API to get a consolidated view of all changes when updating
              plugins across versions. The response includes aggregated breaking
              changes, API changes, and developer notes.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

