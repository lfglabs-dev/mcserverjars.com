/**
 * Paper Indexer
 * Fetches build metadata from PaperMC API and stores in Supabase
 */

import {
  supabase,
  getProjectBySlug,
  getOrCreateMinecraftVersion,
  upsertBuild,
  createSyncLog,
  updateSyncLog,
  clearLatestFlags,
  markLatestBuilds,
} from "./lib/supabase";

const PAPER_API = "https://api.papermc.io/v2";

interface PaperVersion {
  version: string;
  builds: number[];
}

interface PaperBuild {
  build: number;
  time: string;
  channel: string;
  promoted: boolean;
  changes: { commit: string; summary: string; message: string }[];
  downloads: {
    application: {
      name: string;
      sha256: string;
    };
  };
}

async function fetchVersions(): Promise<string[]> {
  const res = await fetch(`${PAPER_API}/projects/paper`);
  const data = await res.json();
  return data.versions || [];
}

async function fetchBuildsForVersion(version: string): Promise<number[]> {
  const res = await fetch(`${PAPER_API}/projects/paper/versions/${version}`);
  const data = await res.json();
  return data.builds || [];
}

async function fetchBuildDetails(
  version: string,
  build: number
): Promise<PaperBuild | null> {
  const res = await fetch(
    `${PAPER_API}/projects/paper/versions/${version}/builds/${build}`
  );
  if (!res.ok) return null;
  return res.json();
}

async function main() {
  console.log("Starting Paper indexer...");

  const project = await getProjectBySlug("paper");
  if (!project) {
    console.error("Paper project not found in database");
    process.exit(1);
  }

  const logId = await createSyncLog(project.id);
  let buildsAdded = 0;
  let buildsUpdated = 0;

  try {
    const versions = await fetchVersions();
    console.log(`Found ${versions.length} Paper versions`);

    // Clear existing latest flags
    await clearLatestFlags(project.id);

    // Process recent versions (limit for efficiency)
    const recentVersions = versions.slice(-20); // Last 20 versions

    for (const version of recentVersions) {
      console.log(`Processing Paper ${version}...`);

      const mcVersionId = await getOrCreateMinecraftVersion(version);
      const builds = await fetchBuildsForVersion(version);

      // Get last 10 builds per version to limit API calls
      const recentBuilds = builds.slice(-10);

      for (const buildNum of recentBuilds) {
        const buildDetails = await fetchBuildDetails(version, buildNum);
        if (!buildDetails) continue;

        const downloadName = buildDetails.downloads.application.name;
        const downloadUrl = `${PAPER_API}/projects/paper/versions/${version}/builds/${buildNum}/downloads/${downloadName}`;

        await upsertBuild({
          project_id: project.id,
          minecraft_version_id: mcVersionId,
          build_number: buildNum,
          version_string: `paper-${version}-${buildNum}`,
          download_url: downloadUrl,
          file_name: downloadName,
          sha256: buildDetails.downloads.application.sha256,
          stability: buildDetails.channel === "default" ? "stable" : "experimental",
          release_date: buildDetails.time,
          changelog:
            buildDetails.changes.length > 0
              ? buildDetails.changes.map((c) => c.summary).join("\n")
              : undefined,
          metadata: {
            promoted: buildDetails.promoted,
            channel: buildDetails.channel,
          },
        });

        buildsAdded++;
      }

      // Small delay to be nice to the API
      await new Promise((r) => setTimeout(r, 100));
    }

    // Mark latest builds
    await markLatestBuilds(project.id);

    await updateSyncLog(logId, "success", {
      builds_added: buildsAdded,
      builds_updated: buildsUpdated,
    });

    console.log(`Paper indexer complete. Added/updated ${buildsAdded} builds.`);
  } catch (error) {
    console.error("Paper indexer failed:", error);
    await updateSyncLog(logId, "failed", {
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
    process.exit(1);
  }
}

main();

