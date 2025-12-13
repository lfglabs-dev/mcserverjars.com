/**
 * Forge Indexer
 *
 * Fetches build metadata from Forge Maven/Promotions API.
 * https://files.minecraftforge.net/net/minecraftforge/forge/
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Forge promotions API - lists recommended/latest versions per MC version
const FORGE_PROMOTIONS_URL =
  "https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json";

interface ForgePromotions {
  homepage: string;
  promos: Record<string, string>; // e.g., "1.20.4-recommended": "49.0.30"
}

async function getProjectId(): Promise<string | null> {
  const { data, error } = await supabase
    .from("jar_projects")
    .select("id")
    .eq("slug", "forge")
    .single();

  if (error || !data) {
    console.error("Forge project not found:", error);
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

async function indexForge(): Promise<void> {
  console.log("Starting Forge indexer...");

  const projectId = await getProjectId();
  if (!projectId) {
    console.error("Could not find Forge project");
    return;
  }

  // Fetch promotions data
  const response = await fetch(FORGE_PROMOTIONS_URL);
  if (!response.ok) {
    console.error("Failed to fetch Forge promotions");
    return;
  }

  const data = (await response.json()) as ForgePromotions;

  let addedBuilds = 0;

  // Process each promotion entry
  for (const [key, forgeVersion] of Object.entries(data.promos)) {
    // Parse the key: "1.20.4-recommended" or "1.20.4-latest"
    const match = key.match(/^(.+)-(recommended|latest)$/);
    if (!match) continue;

    const mcVersion = match[1];
    const channel = match[2];

    // Skip very old versions
    if (mcVersion.startsWith("1.7") || mcVersion.startsWith("1.6")) continue;

    const mcVersionId = await getOrCreateMinecraftVersion(mcVersion);
    if (!mcVersionId) continue;

    // Build download URL
    // Format: https://maven.minecraftforge.net/net/minecraftforge/forge/1.20.4-49.0.30/forge-1.20.4-49.0.30-installer.jar
    const fullVersion = `${mcVersion}-${forgeVersion}`;
    const downloadUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${fullVersion}/forge-${fullVersion}-installer.jar`;
    const fileName = `forge-${fullVersion}-installer.jar`;

    // Use forge version as build number (parse major number)
    const buildNumber = parseInt(forgeVersion.split(".")[0]) || 1;

    const { error } = await supabase.from("jar_builds").upsert(
      {
        project_id: projectId,
        minecraft_version_id: mcVersionId,
        build_number: buildNumber,
        version_string: forgeVersion,
        download_url: downloadUrl,
        file_name: fileName,
        stability: channel === "recommended" ? "stable" : "latest",
        is_latest_for_mc_version: channel === "recommended",
      },
      {
        onConflict: "project_id,minecraft_version_id,build_number",
      }
    );

    if (error) {
      console.error(`Error upserting Forge ${mcVersion}:`, error);
    } else {
      addedBuilds++;
    }
  }

  console.log(`Forge indexer complete. Added/updated ${addedBuilds} builds.`);
}

indexForge().catch(console.error);

