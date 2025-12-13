/**
 * Mohist Indexer
 *
 * Fetches build metadata from Mohist API.
 * https://mohistmc.com/api/v2/projects/mohist
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const MOHIST_API = "https://mohistmc.com/api/v2/projects/mohist";

interface MohistVersionsResponse {
  versions: string[];
}

interface MohistBuildsResponse {
  projectName: string;
  projectVersion: string;
  builds: MohistBuild[];
}

interface MohistBuild {
  number: number;
  gitSha: string;
  forgeVersion: string;
  fileMd5: string;
  originUrl: string;
  url: string;
  createdAt: number;
}

async function getProjectId(): Promise<string | null> {
  const { data, error } = await supabase
    .from("jar_projects")
    .select("id")
    .eq("slug", "mohist")
    .single();

  if (error || !data) {
    console.error("Mohist project not found:", error);
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

async function indexMohist(): Promise<void> {
  console.log("Starting Mohist indexer...");

  const projectId = await getProjectId();
  if (!projectId) {
    console.error("Could not find Mohist project");
    return;
  }

  // Get available versions
  const versionsRes = await fetch(MOHIST_API);
  if (!versionsRes.ok) {
    console.error("Failed to fetch Mohist versions");
    return;
  }

  const versionsData = (await versionsRes.json()) as MohistVersionsResponse;

  console.log(`Found ${versionsData.versions.length} Mohist versions`);

  let addedBuilds = 0;

  for (const mcVersion of versionsData.versions) {
    // Get builds for this version
    const buildsRes = await fetch(`${MOHIST_API}/${mcVersion}/builds`);
    if (!buildsRes.ok) {
      console.log(`  No builds for ${mcVersion}`);
      continue;
    }

    const buildsData = (await buildsRes.json()) as MohistBuildsResponse;

    if (!buildsData.builds || buildsData.builds.length === 0) {
      continue;
    }

    // Get the latest build
    const latestBuild = buildsData.builds[buildsData.builds.length - 1];

    const mcVersionId = await getOrCreateMinecraftVersion(mcVersion);
    if (!mcVersionId) continue;

    const fileName = `mohist-${mcVersion}-${latestBuild.number}.jar`;

    const { error } = await supabase.from("jar_builds").upsert(
      {
        project_id: projectId,
        minecraft_version_id: mcVersionId,
        build_number: latestBuild.number,
        version_string: `${mcVersion}-${latestBuild.number}`,
        download_url: latestBuild.url,
        file_name: fileName,
        stability: "stable",
        is_latest_for_mc_version: true,
        release_date: new Date(latestBuild.createdAt),
      },
      {
        onConflict: "project_id,minecraft_version_id,build_number",
      }
    );

    if (error) {
      console.error(`Error upserting Mohist ${mcVersion}:`, error);
    } else {
      addedBuilds++;
    }
  }

  console.log(`Mohist indexer complete. Added/updated ${addedBuilds} builds.`);
}

indexMohist().catch(console.error);

