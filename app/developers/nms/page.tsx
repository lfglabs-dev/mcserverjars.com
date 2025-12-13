import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { NmsLookup } from "./NmsLookup";

export const revalidate = 300; // 5 minutes

export const metadata: Metadata = {
  title:
    "NMS Version Mappings | Spigot & CraftBukkit Package Revisions | MCServerJars",
  description:
    "Complete mapping of Minecraft versions to CraftBukkit/Spigot NMS package revisions (v1_21_R6, v1_20_R4, etc). Essential reference for Bukkit plugin developers working with NMS code.",
  keywords: [
    "NMS version",
    "CraftBukkit revision",
    "Spigot NMS",
    "v1_21_R6",
    "v1_21_R7",
    "v1_20_R4",
    "Minecraft NMS mapping",
    "CraftBukkit package version",
    "net.minecraft.server",
    "org.bukkit.craftbukkit",
    "Bukkit plugin development",
    "Spigot plugin NMS",
    "NMS revision mapping",
  ],
  openGraph: {
    title: "NMS Version Mappings | Spigot & CraftBukkit Package Revisions",
    description:
      "Complete mapping of Minecraft versions to CraftBukkit/Spigot NMS package revisions. Essential for plugin developers.",
    type: "website",
  },
};

interface NmsMapping {
  minecraft_version: string;
  nms_revision: string;
  craftbukkit_package: string;
  spigot_version: string;
  is_latest_for_revision: boolean;
}

async function getNmsMappings(): Promise<NmsMapping[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return [];
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from("nms_version_mappings")
    .select("*")
    .order("minecraft_version", { ascending: false });

  if (error) {
    console.error("Error fetching NMS mappings:", error);
    return [];
  }

  return data || [];
}

function groupByRevision(mappings: NmsMapping[]): Record<string, NmsMapping[]> {
  const grouped: Record<string, NmsMapping[]> = {};

  for (const mapping of mappings) {
    if (!grouped[mapping.nms_revision]) {
      grouped[mapping.nms_revision] = [];
    }
    grouped[mapping.nms_revision].push(mapping);
  }

  // Sort revisions by version (newest first)
  const sorted: Record<string, NmsMapping[]> = {};
  Object.keys(grouped)
    .sort((a, b) => {
      const parseRev = (r: string) => {
        const match = r.match(/v(\d+)_(\d+)_R(\d+)/);
        if (!match) return [0, 0, 0];
        return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
      };
      const [aMaj, aMin, aRev] = parseRev(a);
      const [bMaj, bMin, bRev] = parseRev(b);
      return bMaj - aMaj || bMin - aMin || bRev - aRev;
    })
    .forEach((key) => {
      sorted[key] = grouped[key];
    });

  return sorted;
}

export default async function DevelopersPage() {
  const mappings = await getNmsMappings();
  const groupedMappings = groupByRevision(mappings);

  // Create lookup maps
  const byVersion: Record<string, string> = {};
  const byRevision: Record<string, string[]> = {};

  for (const mapping of mappings) {
    byVersion[mapping.minecraft_version] = mapping.nms_revision;
    if (!byRevision[mapping.nms_revision]) {
      byRevision[mapping.nms_revision] = [];
    }
    byRevision[mapping.nms_revision].push(mapping.minecraft_version);
  }

  return (
    <div className="min-h-screen hero-gradient">
      {/* Hero Section */}
      <div className="mx-auto max-w-3xl px-4 pt-16 pb-12 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Developer Tools
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          NMS Version Mappings
        </h1>

        <p className="text-lg text-[var(--text-muted)] max-w-xl mx-auto">
          Instantly find the CraftBukkit package revision for any Minecraft
          version.
          <br />
          <span className="text-sm opacity-75">
            Used in reflection-based NMS access
          </span>
        </p>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6 lg:px-8">
        <NmsLookup
          byVersion={byVersion}
          byRevision={byRevision}
          groupedMappings={groupedMappings}
        />

        {/* Quick Reference */}
        <section className="mt-16">
          <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-6">
            Quick Reference
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-subtle)] border border-[var(--border-subtle)]">
              <h3 className="font-semibold mb-3">CraftBukkit Package</h3>
              <code className="text-sm text-emerald-600 dark:text-emerald-400 break-all">
                org.bukkit.craftbukkit.
                <span className="text-amber-500">{"{revision}"}</span>
                .CraftServer
              </code>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-subtle)] border border-[var(--border-subtle)]">
              <h3 className="font-semibold mb-3">Runtime Detection</h3>
              <code className="text-sm text-[var(--text-muted)] break-all">
                Bukkit.getServer().getClass()
                <br />
                <span className="opacity-50">&nbsp;&nbsp;</span>
                .getPackage().getName()
                <br />
                <span className="opacity-50">&nbsp;&nbsp;</span>
                .split(&quot;\\.&quot;)[3]
              </code>
            </div>
          </div>
        </section>

        {/* SEO Content - minimal, clean */}
        <section className="mt-16 pt-16 border-t border-[var(--border-subtle)]">
          <div className="prose prose-sm dark:prose-invert max-w-none opacity-75">
            <h2 className="text-lg font-semibold">About NMS Revisions</h2>
            <p>
              The NMS revision (e.g., <code>v1_21_R4</code>) is the package
              version used in CraftBukkit class names. It changes when Mojang
              makes significant internal changes to Minecraft&apos;s server
              code. Multiple Minecraft versions may share the same revision if
              their internal structures remain compatible.
            </p>
            <p>
              Since Minecraft 1.17, the{" "}
              <code>net.minecraft.server.vX_XX_RX</code> package style is
              deprecated in favor of deobfuscated names, but CraftBukkit classes
              still use the versioned package structure.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
