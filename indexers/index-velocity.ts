/**
 * Velocity Indexer
 *
 * Fetches build metadata from PaperMC API for Velocity proxy.
 * https://api.papermc.io/v2/projects/velocity
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const VELOCITY_API = "https://api.papermc.io/v2/projects/velocity";

interface VelocityVersionsResponse {
  project_id: string;
  project_name: string;
  versions: string[];
}

interface VelocityBuildsResponse {
  project_id: string;
  version: string;
  builds: number[];
}

interface VelocityBuildResponse {
  project_id: string;
  version: string;
  build: number;
  time: string;
  channel: string;
  downloads: {
    application: {
      name: string;
      sha256: string;
    };
  };
}

async function getProjectId(): Promise<string | null> {
  const { data, error } = await supabase
    .from("jar_projects")
    .select("id")
    .eq("slug", "velocity")
    .single();

  if (error || !data) {
    console.error("Velocity project not found:", error);
    return null;
  }

  return data.id;
}

async function getOrCreateMinecraftVersion(
  version: string
): Promise<string | null> {
  // For proxies, we use version as the "minecraft version" since they support ranges
  const { data: existing } = await supabase
    .from("minecraft_versions")
    .select("id")
    .eq("version", version)
    .single();

  if (existing) {
    return existing.id;
  }

  // Create a new version entry
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

async function indexVelocity(): Promise<void> {
  console.log("Starting Velocity indexer...");

  const projectId = await getProjectId();
  if (!projectId) {
    console.error("Could not find Velocity project");
    return;
  }

  // Get available versions
  const versionsRes = await fetch(VELOCITY_API);
  const versionsData = (await versionsRes.json()) as VelocityVersionsResponse;

  console.log(`Found ${versionsData.versions.length} Velocity versions`);

  let addedBuilds = 0;

  // Process each version (latest first)
  const versions = [...versionsData.versions].reverse();

  for (const version of versions) {
    // Get builds for this version
    const buildsRes = await fetch(`${VELOCITY_API}/versions/${version}`);
    const buildsData = (await buildsRes.json()) as VelocityBuildsResponse;

    if (!buildsData.builds || buildsData.builds.length === 0) {
      continue;
    }

    // Get the latest build for this version
    const latestBuildNum = buildsData.builds[buildsData.builds.length - 1];

    // Get build details
    const buildRes = await fetch(
      `${VELOCITY_API}/versions/${version}/builds/${latestBuildNum}`
    );
    const buildData = (await buildRes.json()) as VelocityBuildResponse;

    const mcVersionId = await getOrCreateMinecraftVersion(version);
    if (!mcVersionId) {
      continue;
    }

    const downloadUrl = `${VELOCITY_API}/versions/${version}/builds/${latestBuildNum}/downloads/${buildData.downloads.application.name}`;

    // Upsert the build
    const { error } = await supabase.from("jar_builds").upsert(
      {
        project_id: projectId,
        minecraft_version_id: mcVersionId,
        build_number: latestBuildNum,
        version_string: version,
        download_url: downloadUrl,
        file_name: buildData.downloads.application.name,
        sha256: buildData.downloads.application.sha256,
        stability:
          buildData.channel === "default" ? "stable" : buildData.channel,
        is_latest_for_mc_version: true,
        release_date: new Date(buildData.time),
      },
      {
        onConflict: "project_id,minecraft_version_id,build_number",
      }
    );

    if (error) {
      console.error(
        `Error upserting Velocity ${version} build ${latestBuildNum}:`,
        error
      );
    } else {
      addedBuilds++;
    }
  }

  console.log(
    `Velocity indexer complete. Added/updated ${addedBuilds} builds.`
  );
}

indexVelocity().catch(console.error);
