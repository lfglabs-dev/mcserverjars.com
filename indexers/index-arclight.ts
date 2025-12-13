/**
 * Arclight Indexer
 *
 * Fetches build metadata from Arclight GitHub Releases.
 * https://github.com/IzzelAliz/Arclight/releases
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const ARCLIGHT_RELEASES_URL =
  "https://api.github.com/repos/IzzelAliz/Arclight/releases";

interface GitHubRelease {
  tag_name: string;
  name: string;
  prerelease: boolean;
  published_at: string;
  assets: GitHubAsset[];
}

interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

async function getProjectId(): Promise<string | null> {
  const { data, error } = await supabase
    .from("jar_projects")
    .select("id")
    .eq("slug", "arclight")
    .single();

  if (error || !data) {
    console.error("Arclight project not found:", error);
    return null;
  }

  return data.id;
}

async function getOrCreateMinecraftVersion(
  version: string
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("minecraft_versions")
    .select("id")
    .eq("version", version)
    .single();

  if (existing) {
    return existing.id;
  }

  const { data: created, error } = await supabase
    .from("minecraft_versions")
    .insert({
      version,
      version_type: "release",
    })
    .select("id")
    .single();

  if (error) {
    console.error(`Failed to create version ${version}:`, error);
    return null;
  }

  return created?.id || null;
}

function extractMcVersion(tagName: string): string | null {
  // Arclight tags: "1.20.4/1.0.5", "forge/1.20.1", "1.21/1.0.0"
  const patterns = [
    /^(\d+\.\d+(?:\.\d+)?)\/.+$/, // "1.20.4/1.0.5"
    /^forge\/(\d+\.\d+(?:\.\d+)?)$/, // "forge/1.20.1"
    /^fabric\/(\d+\.\d+(?:\.\d+)?)$/, // "fabric/1.20.1"
    /^neoforge\/(\d+\.\d+(?:\.\d+)?)$/, // "neoforge/1.20.1"
  ];

  for (const pattern of patterns) {
    const match = tagName.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

async function indexArclight(): Promise<void> {
  console.log("Starting Arclight indexer...");

  const projectId = await getProjectId();
  if (!projectId) {
    console.error("Could not find Arclight project");
    return;
  }

  // Fetch releases from GitHub
  const response = await fetch(ARCLIGHT_RELEASES_URL, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "MCServerJars-Indexer",
    },
  });

  if (!response.ok) {
    console.error("Failed to fetch Arclight releases");
    return;
  }

  const releases = (await response.json()) as GitHubRelease[];

  console.log(`Found ${releases.length} Arclight releases`);

  let addedBuilds = 0;

  // Group releases by MC version and get the latest for each
  const releasesByMc = new Map<string, GitHubRelease>();

  for (const release of releases) {
    if (release.prerelease) continue;

    const mcVersion = extractMcVersion(release.tag_name);
    if (!mcVersion) continue;

    // Only keep the latest (first encountered) for each MC version
    if (!releasesByMc.has(mcVersion)) {
      releasesByMc.set(mcVersion, release);
    }
  }

  for (const [mcVersion, release] of releasesByMc) {
    const mcVersionId = await getOrCreateMinecraftVersion(mcVersion);
    if (!mcVersionId) continue;

    // Find the main Arclight jar (not sources, not javadoc)
    const jarAsset = release.assets.find(
      (a) =>
        a.name.endsWith(".jar") &&
        !a.name.includes("sources") &&
        !a.name.includes("javadoc") &&
        a.name.toLowerCase().includes("arclight")
    );

    if (!jarAsset) {
      console.log(`  No jar found for ${mcVersion} (${release.tag_name})`);
      continue;
    }

    // Parse build number from tag
    const versionParts = release.tag_name.split("/");
    const arclightVersion = versionParts[versionParts.length - 1];
    const buildNumber =
      parseInt(arclightVersion.replace(/\./g, "")) ||
      Date.parse(release.published_at);

    const { error } = await supabase.from("jar_builds").upsert(
      {
        project_id: projectId,
        minecraft_version_id: mcVersionId,
        build_number: buildNumber,
        version_string: release.tag_name,
        download_url: jarAsset.browser_download_url,
        file_name: jarAsset.name,
        file_size: jarAsset.size,
        stability: "stable",
        is_latest_for_mc_version: true,
        release_date: new Date(release.published_at),
      },
      {
        onConflict: "project_id,minecraft_version_id,build_number",
      }
    );

    if (error) {
      console.error(`Error upserting Arclight ${mcVersion}:`, error);
    } else {
      addedBuilds++;
    }
  }

  console.log(
    `Arclight indexer complete. Added/updated ${addedBuilds} builds.`
  );
}

indexArclight().catch(console.error);

