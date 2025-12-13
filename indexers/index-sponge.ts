/**
 * Sponge Indexer
 *
 * Fetches build metadata from Sponge Downloads API.
 * https://dl-api.spongepowered.org/v2
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const SPONGE_API = "https://dl-api.spongepowered.org/v2";

interface SpongeArtifactInfo {
  type: string;
  coordinates: { groupId: string; artifactId: string };
  displayName: string;
  tags: {
    minecraft: string[];
    api: string[];
  };
}

interface SpongeVersionsResponse {
  artifacts: Record<
    string,
    {
      tagValues: { minecraft: string; api: string };
      recommended: boolean;
    }
  >;
  offset: number;
  limit: number;
  size: number;
}

interface SpongeVersionDetails {
  coordinates: { groupId: string; artifactId: string; version: string };
  tagValues: { minecraft: string; api: string };
  recommended: boolean;
  assets: SpongeAsset[];
}

interface SpongeAsset {
  classifier: string;
  extension: string;
  downloadUrl: string;
  md5: string;
  sha1: string;
}

async function getProjectId(): Promise<string | null> {
  const { data, error } = await supabase
    .from("jar_projects")
    .select("id")
    .eq("slug", "sponge")
    .single();

  if (error || !data) {
    console.error("Sponge project not found:", error);
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
      version_type: version.includes("-") ? "snapshot" : "release",
    })
    .select("id")
    .single();

  if (error) {
    console.error(`Failed to create version ${version}:`, error);
    return null;
  }

  return created?.id || null;
}

async function indexSponge(): Promise<void> {
  console.log("Starting Sponge indexer...");

  const projectId = await getProjectId();
  if (!projectId) {
    console.error("Could not find Sponge project");
    return;
  }

  let addedBuilds = 0;

  // Get artifact info to find available MC versions
  const artifactRes = await fetch(
    `${SPONGE_API}/groups/org.spongepowered/artifacts/spongevanilla`
  );
  if (!artifactRes.ok) {
    console.error("Failed to fetch SpongeVanilla artifact info");
    return;
  }

  const artifactInfo = (await artifactRes.json()) as SpongeArtifactInfo;
  const mcVersions = artifactInfo.tags.minecraft.filter(
    (v) => !v.includes("-") && !v.startsWith("25w") && !v.startsWith("24w")
  );

  console.log(`Found ${mcVersions.length} release MC versions for Sponge`);

  // Process each MC version (limit to recent ones)
  for (const mcVersion of mcVersions.slice(0, 20)) {
    try {
      // Get versions for this MC version
      const versionsRes = await fetch(
        `${SPONGE_API}/groups/org.spongepowered/artifacts/spongevanilla/versions?tags=minecraft:${mcVersion}&limit=1`
      );

      if (!versionsRes.ok) continue;

      const versionsData = (await versionsRes.json()) as SpongeVersionsResponse;
      const versionKeys = Object.keys(versionsData.artifacts);

      if (versionKeys.length === 0) continue;

      // Get the latest version (first one)
      const latestVersionKey = versionKeys[0];
      const latestVersionInfo = versionsData.artifacts[latestVersionKey];

      // Get version details to get download URL
      const versionDetailsRes = await fetch(
        `${SPONGE_API}/groups/org.spongepowered/artifacts/spongevanilla/versions/${latestVersionKey}`
      );

      if (!versionDetailsRes.ok) continue;

      const versionDetails =
        (await versionDetailsRes.json()) as SpongeVersionDetails;

      // Find universal jar
      const universalAsset = versionDetails.assets.find(
        (a) => a.classifier === "universal" && a.extension === "jar"
      );

      if (!universalAsset) continue;

      const mcVersionId = await getOrCreateMinecraftVersion(mcVersion);
      if (!mcVersionId) continue;

      // Parse build number from version (e.g., "1.21.4-14.0.0-RC2464" -> 2464)
      const buildMatch = latestVersionKey.match(/RC(\d+)$/);
      const buildNumber = buildMatch ? parseInt(buildMatch[1]) : 1;

      const { error } = await supabase.from("jar_builds").upsert(
        {
          project_id: projectId,
          minecraft_version_id: mcVersionId,
          build_number: buildNumber,
          version_string: latestVersionKey,
          download_url: universalAsset.downloadUrl,
          file_name: `spongevanilla-${latestVersionKey}-universal.jar`,
          stability: latestVersionInfo.recommended ? "stable" : "latest",
          is_latest_for_mc_version: true,
        },
        {
          onConflict: "project_id,minecraft_version_id,build_number",
        }
      );

      if (error) {
        console.error(`Error upserting Sponge ${mcVersion}:`, error);
      } else {
        addedBuilds++;
      }
    } catch (err) {
      console.error(`Error processing Sponge ${mcVersion}:`, err);
    }
  }

  console.log(`Sponge indexer complete. Added/updated ${addedBuilds} builds.`);
}

indexSponge().catch(console.error);
