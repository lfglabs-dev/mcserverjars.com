/**
 * BungeeCord Indexer
 *
 * Fetches build metadata from SpigotMC Jenkins.
 * https://ci.md-5.net/job/BungeeCord/
 * 
 * BungeeCord is built via Jenkins, unlike Spigot which requires BuildTools.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const BUNGEECORD_JOB_URL = "https://ci.md-5.net/job/BungeeCord/";

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
    .eq("slug", "bungeecord")
    .single();

  if (error || !data) {
    console.error("BungeeCord project not found:", error);
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

async function indexBungeeCord(): Promise<void> {
  console.log("Starting BungeeCord indexer...");

  const projectId = await getProjectId();
  if (!projectId) {
    console.error("Could not find BungeeCord project");
    return;
  }

  let addedBuilds = 0;

  try {
    // Get job info
    const jobRes = await fetch(`${BUNGEECORD_JOB_URL}api/json?tree=builds[number,url],lastSuccessfulBuild[number,url]`);
    if (!jobRes.ok) {
      console.error("Failed to fetch BungeeCord job info");
      return;
    }

    const jobData = (await jobRes.json()) as JenkinsJobResponse;

    if (!jobData.lastSuccessfulBuild) {
      console.error("No successful BungeeCord build found");
      return;
    }

    // Get build details
    const buildRes = await fetch(`${jobData.lastSuccessfulBuild.url}api/json`);
    if (!buildRes.ok) {
      console.error("Failed to fetch BungeeCord build details");
      return;
    }

    const build = (await buildRes.json()) as JenkinsBuild;

    // BungeeCord is version-agnostic (works with all MC versions)
    // We'll create a "latest" version entry for it
    const versionString = "latest";

    const mcVersionId = await getOrCreateMinecraftVersion(versionString);
    if (!mcVersionId) {
      return;
    }

    // Find the main BungeeCord jar (not modules)
    const jarArtifact = build.artifacts.find(
      (a) => a.fileName === "BungeeCord.jar"
    );

    if (!jarArtifact) {
      console.error("BungeeCord.jar artifact not found");
      // List available artifacts for debugging
      console.log("Available artifacts:", build.artifacts.map(a => a.fileName).join(", "));
      return;
    }

    const downloadUrl = `${build.url}artifact/${jarArtifact.relativePath}`;

    const { error } = await supabase.from("jar_builds").upsert(
      {
        project_id: projectId,
        minecraft_version_id: mcVersionId,
        build_number: build.number,
        version_string: `#${build.number}`,
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
      console.error(`Error upserting BungeeCord build ${build.number}:`, error);
    } else {
      addedBuilds++;
      console.log(`Added BungeeCord build #${build.number}`);
    }

    // Also fetch a few recent builds for history
    const recentBuilds = jobData.builds.slice(0, 10);
    for (const buildRef of recentBuilds) {
      if (buildRef.number === build.number) continue; // Skip the one we already added

      try {
        const histBuildRes = await fetch(`${buildRef.url}api/json`);
        if (!histBuildRes.ok) continue;

        const histBuild = (await histBuildRes.json()) as JenkinsBuild;
        if (histBuild.result !== "SUCCESS") continue;

        const histJar = histBuild.artifacts.find((a) => a.fileName === "BungeeCord.jar");
        if (!histJar) continue;

        const histDownloadUrl = `${histBuild.url}artifact/${histJar.relativePath}`;

        await supabase.from("jar_builds").upsert(
          {
            project_id: projectId,
            minecraft_version_id: mcVersionId,
            build_number: histBuild.number,
            version_string: `#${histBuild.number}`,
            download_url: histDownloadUrl,
            file_name: histJar.fileName,
            stability: "stable",
            is_latest_for_mc_version: histBuild.number === build.number,
            release_date: new Date(histBuild.timestamp),
          },
          {
            onConflict: "project_id,minecraft_version_id,build_number",
          }
        );

        addedBuilds++;
      } catch {
        // Ignore individual build fetch errors
      }
    }
  } catch (error) {
    console.error("Error indexing BungeeCord:", error);
  }

  console.log(`BungeeCord indexer complete. Added/updated ${addedBuilds} builds.`);
}

indexBungeeCord().catch(console.error);

