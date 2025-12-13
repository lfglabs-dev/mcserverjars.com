/**
 * Pufferfish Indexer
 *
 * Fetches build metadata from Pufferfish CI.
 * https://ci.pufferfish.host/
 * 
 * Pufferfish provides builds via their Jenkins CI.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Pufferfish builds are available via their download page
// They build for specific MC versions
const PUFFERFISH_VERSIONS: Record<string, string> = {
  "1.21.4": "https://ci.pufferfish.host/job/Pufferfish-1.21/",
  "1.20.6": "https://ci.pufferfish.host/job/Pufferfish-1.20/",
  "1.20.4": "https://ci.pufferfish.host/job/Pufferfish-1.20/",
  "1.19.4": "https://ci.pufferfish.host/job/Pufferfish-1.19/",
  "1.18.2": "https://ci.pufferfish.host/job/Pufferfish-1.18/",
  "1.17.1": "https://ci.pufferfish.host/job/Pufferfish-1.17/",
};

interface JenkinsBuild {
  number: number;
  url: string;
  result: string;
  timestamp: number;
  artifacts: Array<{
    fileName: string;
    relativePath: string;
  }>;
}

interface JenkinsJobResponse {
  builds: Array<{ number: number; url: string }>;
  lastSuccessfulBuild: { number: number; url: string } | null;
}

async function getProjectId(): Promise<string | null> {
  const { data, error } = await supabase
    .from("jar_projects")
    .select("id")
    .eq("slug", "pufferfish")
    .single();

  if (error || !data) {
    console.error("Pufferfish project not found:", error);
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

async function fetchJenkinsBuild(jobUrl: string): Promise<JenkinsBuild | null> {
  try {
    // Get job info
    const jobRes = await fetch(`${jobUrl}api/json`);
    if (!jobRes.ok) return null;
    
    const jobData = (await jobRes.json()) as JenkinsJobResponse;
    
    if (!jobData.lastSuccessfulBuild) {
      return null;
    }

    // Get last successful build details
    const buildRes = await fetch(`${jobData.lastSuccessfulBuild.url}api/json`);
    if (!buildRes.ok) return null;

    return (await buildRes.json()) as JenkinsBuild;
  } catch (error) {
    console.error(`Error fetching Jenkins build from ${jobUrl}:`, error);
    return null;
  }
}

async function indexPufferfish(): Promise<void> {
  console.log("Starting Pufferfish indexer...");

  const projectId = await getProjectId();
  if (!projectId) {
    console.error("Could not find Pufferfish project");
    return;
  }

  let addedBuilds = 0;

  for (const [version, jobUrl] of Object.entries(PUFFERFISH_VERSIONS)) {
    console.log(`Processing Pufferfish ${version}...`);

    const build = await fetchJenkinsBuild(jobUrl);
    if (!build) {
      console.log(`  No successful build found for ${version}`);
      continue;
    }

    const mcVersionId = await getOrCreateMinecraftVersion(version);
    if (!mcVersionId) {
      continue;
    }

    // Find the jar artifact
    const jarArtifact = build.artifacts.find(
      (a) => a.fileName.endsWith(".jar") && !a.fileName.includes("mojang-mapped")
    );

    if (!jarArtifact) {
      console.log(`  No jar artifact found for ${version}`);
      continue;
    }

    const downloadUrl = `${build.url}artifact/${jarArtifact.relativePath}`;

    const { error } = await supabase.from("jar_builds").upsert(
      {
        project_id: projectId,
        minecraft_version_id: mcVersionId,
        build_number: build.number,
        version_string: version,
        download_url: downloadUrl,
        file_name: jarArtifact.fileName,
        stability: "stable",
        is_latest_for_mc_version: true,
        release_date: new Date(build.timestamp),
      },
      {
        onConflict: "project_id,minecraft_version_id,build_number",
      }
    );

    if (error) {
      console.error(`Error upserting Pufferfish ${version}:`, error);
    } else {
      addedBuilds++;
    }
  }

  console.log(`Pufferfish indexer complete. Added/updated ${addedBuilds} builds.`);
}

indexPufferfish().catch(console.error);

