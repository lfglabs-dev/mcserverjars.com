import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { ChangelogTimeline } from "./ChangelogTimeline";

export const revalidate = 300; // 5 minutes

export const metadata: Metadata = {
  title: "Developer Changelogs | Minecraft Server Updates | MCServerJars",
  description:
    "Developer-focused changelogs for Minecraft, Spigot, and Paper. Track breaking changes, API updates, and resource format changes across versions.",
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

function compareVersions(a: string, b: string): number {
  const partsA = a.split(".").map(Number);
  const partsB = b.split(".").map(Number);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA !== numB) return numB - numA;
  }
  return 0;
}

export default async function ChangelogsPage() {
  const changelogs = await getChangelogs();

  // Group by version
  const byVersion: Record<string, Record<string, Changelog>> = {};
  for (const log of changelogs) {
    if (!byVersion[log.version]) {
      byVersion[log.version] = {};
    }
    byVersion[log.version][log.project] = log;
  }

  const versions = Object.keys(byVersion).sort(compareVersions);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-[var(--border-subtle)]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.06),transparent_50%)]" />
        
        <div className="relative mx-auto max-w-5xl px-6 py-20 text-center">
          <h1 className="text-5xl font-black tracking-tight bg-gradient-to-br from-[var(--text-primary)] via-[var(--text-primary)] to-violet-500 bg-clip-text text-transparent">
            Version Changelogs
          </h1>
          <p className="mt-4 text-lg text-[var(--text-muted)] max-w-2xl mx-auto">
            Developer-focused changelogs with breaking changes, API updates, and everything you need to keep your plugins up to date.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-5xl px-6 py-12">
        <ChangelogTimeline versions={versions} byVersion={byVersion} />

        {/* API Section */}
        <section className="mt-20 pt-12 border-t border-[var(--border-subtle)]">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-8">
            API Access
          </h2>
          
          <div className="grid gap-4 md:grid-cols-3">
            <ApiCard
              title="Single Version"
              endpoint="/api/v1/changelogs/1.21.11"
              description="Get all changelogs for a specific version"
            />
            <ApiCard
              title="By Project"
              endpoint="/api/v1/changelogs?project=paper"
              description="Filter changelogs by project type"
            />
            <ApiCard
              title="Version Range"
              endpoint="/api/v1/changelogs/range?from=1.21.9&to=1.21.11"
              description="Get aggregated changes between versions"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function ApiCard({ title, endpoint, description }: { title: string; endpoint: string; description: string }) {
  return (
    <div className="group p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-violet-500/30 transition-colors">
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <code className="text-xs text-violet-500 font-mono break-all">{endpoint}</code>
      <p className="text-xs text-[var(--text-muted)] mt-2">{description}</p>
    </div>
  );
}
