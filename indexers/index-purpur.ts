/**
 * Purpur Indexer
 * Fetches build metadata from Purpur API
 */

import {
  getProjectBySlug,
  getOrCreateMinecraftVersion,
  upsertBuild,
  createSyncLog,
  updateSyncLog,
  clearLatestFlags,
  markLatestBuilds,
} from "./lib/supabase";

const PURPUR_API = "https://api.purpurmc.org/v2";

interface PurpurVersions {
  versions: string[];
}

interface PurpurBuilds {
  builds: {
    all: string[];
    latest: string;
  };
}

interface PurpurBuild {
  build: string;
  result: string;
  timestamp: number;
  duration: number;
  commits: { author: string; description: string; hash: string; timestamp: number }[];
  md5: string;
}

async function main() {
  console.log("Starting Purpur indexer...");

  const project = await getProjectBySlug("purpur");
  if (!project) {
    console.error("Purpur project not found in database");
    process.exit(1);
  }

  const logId = await createSyncLog(project.id);
  let buildsAdded = 0;

  try {
    const versionsRes = await fetch(`${PURPUR_API}/purpur`);
    const versionsData: PurpurVersions = await versionsRes.json();

    console.log(`Found ${versionsData.versions.length} Purpur versions`);

    // Clear existing latest flags
    await clearLatestFlags(project.id);

    // Process recent versions
    const recentVersions = versionsData.versions.slice(-15);

    for (const version of recentVersions) {
      console.log(`Processing Purpur ${version}...`);

      const mcVersionId = await getOrCreateMinecraftVersion(version);

      // Get builds for this version
      const buildsRes = await fetch(`${PURPUR_API}/purpur/${version}`);
      const buildsData: PurpurBuilds = await buildsRes.json();

      // Get last 5 builds
      const recentBuilds = buildsData.builds.all.slice(-5);

      for (const buildNum of recentBuilds) {
        const buildRes = await fetch(`${PURPUR_API}/purpur/${version}/${buildNum}`);
        const buildDetails: PurpurBuild = await buildRes.json();

        const buildNumber = parseInt(buildNum, 10);
        const downloadUrl = `${PURPUR_API}/purpur/${version}/${buildNum}/download`;

        await upsertBuild({
          project_id: project.id,
          minecraft_version_id: mcVersionId,
          build_number: buildNumber,
          version_string: `purpur-${version}-${buildNum}`,
          download_url: downloadUrl,
          file_name: `purpur-${version}-${buildNum}.jar`,
          md5: buildDetails.md5,
          stability: buildDetails.result === "SUCCESS" ? "stable" : "experimental",
          release_date: new Date(buildDetails.timestamp).toISOString(),
          changelog:
            buildDetails.commits.length > 0
              ? buildDetails.commits.map((c) => c.description).join("\n")
              : undefined,
          metadata: {
            result: buildDetails.result,
            duration: buildDetails.duration,
          },
        });

        buildsAdded++;
      }

      await new Promise((r) => setTimeout(r, 100));
    }

    // Mark latest builds
    await markLatestBuilds(project.id);

    await updateSyncLog(logId, "success", { builds_added: buildsAdded });
    console.log(`Purpur indexer complete. Added/updated ${buildsAdded} builds.`);
  } catch (error) {
    console.error("Purpur indexer failed:", error);
    await updateSyncLog(logId, "failed", {
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
    process.exit(1);
  }
}

main();

