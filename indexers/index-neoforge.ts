/**
 * NeoForge Indexer
 *
 * Fetches build metadata from NeoForge API.
 * https://projects.neoforged.net/
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// NeoForge versions API
const NEOFORGE_VERSIONS_URL =
  "https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge";
const NEOFORGE_LEGACY_VERSIONS_URL =
  "https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/forge";

interface NeoForgeVersionsResponse {
  versions: string[];
}

async function getProjectId(): Promise<string | null> {
  const { data, error } = await supabase
    .from("jar_projects")
    .select("id")
    .eq("slug", "neoforge")
    .single();

  if (error || !data) {
    console.error("NeoForge project not found:", error);
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

function extractMcVersion(neoforgeVersion: string): string | null {
  // NeoForge versions: 20.4.123 -> MC 1.20.4, 21.1.45 -> MC 1.21.1
  // Format: MCMAJOR.MCMINOR.BUILD where MCMAJOR maps to 1.MCMAJOR
  const match = neoforgeVersion.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;

  const major = parseInt(match[1]);
  const minor = parseInt(match[2]);

  // NeoForge started with MC 1.20.x
  if (major >= 20) {
    return minor === 0 ? `1.${major}` : `1.${major}.${minor}`;
  }

  return null;
}

async function indexNeoForge(): Promise<void> {
  console.log("Starting NeoForge indexer...");

  const projectId = await getProjectId();
  if (!projectId) {
    console.error("Could not find NeoForge project");
    return;
  }

  // Fetch versions
  const response = await fetch(NEOFORGE_VERSIONS_URL);
  if (!response.ok) {
    console.error("Failed to fetch NeoForge versions");
    return;
  }

  const data = (await response.json()) as NeoForgeVersionsResponse;

  let addedBuilds = 0;

  // Group versions by MC version and get the latest for each
  const versionsByMc = new Map<string, string[]>();

  for (const version of data.versions) {
    const mcVersion = extractMcVersion(version);
    if (!mcVersion) continue;

    if (!versionsByMc.has(mcVersion)) {
      versionsByMc.set(mcVersion, []);
    }
    versionsByMc.get(mcVersion)!.push(version);
  }

  // Process each MC version (get latest NeoForge for each)
  for (const [mcVersion, neoforgeVersions] of versionsByMc) {
    // Sort to get latest
    neoforgeVersions.sort((a, b) => {
      const [aMaj, aMin, aPatch] = a.split(".").map(Number);
      const [bMaj, bMin, bPatch] = b.split(".").map(Number);
      return bMaj - aMaj || bMin - aMin || (bPatch || 0) - (aPatch || 0);
    });

    const latestVersion = neoforgeVersions[0];
    const mcVersionId = await getOrCreateMinecraftVersion(mcVersion);
    if (!mcVersionId) continue;

    // Build download URL
    const downloadUrl = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${latestVersion}/neoforge-${latestVersion}-installer.jar`;
    const fileName = `neoforge-${latestVersion}-installer.jar`;

    // Parse build number from version
    const buildNumber = parseInt(latestVersion.split(".")[2]) || 1;

    const { error } = await supabase.from("jar_builds").upsert(
      {
        project_id: projectId,
        minecraft_version_id: mcVersionId,
        build_number: buildNumber,
        version_string: latestVersion,
        download_url: downloadUrl,
        file_name: fileName,
        stability: "stable",
        is_latest_for_mc_version: true,
      },
      {
        onConflict: "project_id,minecraft_version_id,build_number",
      }
    );

    if (error) {
      console.error(`Error upserting NeoForge ${mcVersion}:`, error);
    } else {
      addedBuilds++;
    }
  }

  console.log(
    `NeoForge indexer complete. Added/updated ${addedBuilds} builds.`
  );
}

indexNeoForge().catch(console.error);

