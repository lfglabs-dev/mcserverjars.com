/**
 * Waterfall Indexer
 *
 * Fetches build metadata from PaperMC API for Waterfall proxy.
 * https://api.papermc.io/v2/projects/waterfall
 * 
 * Note: Waterfall is deprecated in favor of Velocity, but still available.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const WATERFALL_API = "https://api.papermc.io/v2/projects/waterfall";

interface WaterfallVersionsResponse {
  project_id: string;
  project_name: string;
  versions: string[];
}

interface WaterfallBuildsResponse {
  project_id: string;
  version: string;
  builds: number[];
}

interface WaterfallBuildResponse {
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
    .eq("slug", "waterfall")
    .single();

  if (error || !data) {
    console.error("Waterfall project not found:", error);
    return null;
  }

  return data.id;
}

async function getOrCreateMinecraftVersion(version: string): Promise<string | null> {
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

async function indexWaterfall(): Promise<void> {
  console.log("Starting Waterfall indexer...");

  const projectId = await getProjectId();
  if (!projectId) {
    console.error("Could not find Waterfall project");
    return;
  }

  const versionsRes = await fetch(WATERFALL_API);
  const versionsData = (await versionsRes.json()) as WaterfallVersionsResponse;

  console.log(`Found ${versionsData.versions.length} Waterfall versions`);

  let addedBuilds = 0;

  const versions = [...versionsData.versions].reverse();

  for (const version of versions) {
    const buildsRes = await fetch(`${WATERFALL_API}/versions/${version}`);
    const buildsData = (await buildsRes.json()) as WaterfallBuildsResponse;

    if (!buildsData.builds || buildsData.builds.length === 0) {
      continue;
    }

    const latestBuildNum = buildsData.builds[buildsData.builds.length - 1];

    const buildRes = await fetch(
      `${WATERFALL_API}/versions/${version}/builds/${latestBuildNum}`
    );
    const buildData = (await buildRes.json()) as WaterfallBuildResponse;

    const mcVersionId = await getOrCreateMinecraftVersion(version);
    if (!mcVersionId) {
      continue;
    }

    const downloadUrl = `${WATERFALL_API}/versions/${version}/builds/${latestBuildNum}/downloads/${buildData.downloads.application.name}`;

    const { error } = await supabase.from("jar_builds").upsert(
      {
        project_id: projectId,
        minecraft_version_id: mcVersionId,
        build_number: latestBuildNum,
        version_string: version,
        download_url: downloadUrl,
        file_name: buildData.downloads.application.name,
        sha256: buildData.downloads.application.sha256,
        stability: buildData.channel === "default" ? "stable" : buildData.channel,
        is_latest_for_mc_version: true,
        release_date: new Date(buildData.time),
      },
      {
        onConflict: "project_id,minecraft_version_id,build_number",
      }
    );

    if (error) {
      console.error(`Error upserting Waterfall ${version} build ${latestBuildNum}:`, error);
    } else {
      addedBuilds++;
    }
  }

  console.log(`Waterfall indexer complete. Added/updated ${addedBuilds} builds.`);
}

indexWaterfall().catch(console.error);

