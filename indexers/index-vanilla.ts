/**
 * Vanilla Indexer
 * Fetches official Minecraft server jars from Mojang's launcher meta
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

const VERSION_MANIFEST =
  "https://launchermeta.mojang.com/mc/game/version_manifest_v2.json";

interface VersionManifest {
  latest: {
    release: string;
    snapshot: string;
  };
  versions: {
    id: string;
    type: "release" | "snapshot" | "old_beta" | "old_alpha";
    url: string;
    releaseTime: string;
    sha1: string;
  }[];
}

interface VersionDetails {
  downloads: {
    server?: {
      sha1: string;
      size: number;
      url: string;
    };
  };
}

async function main() {
  console.log("Starting Vanilla indexer...");

  const project = await getProjectBySlug("vanilla");
  if (!project) {
    console.error("Vanilla project not found in database");
    process.exit(1);
  }

  const logId = await createSyncLog(project.id);
  let buildsAdded = 0;

  try {
    const manifestRes = await fetch(VERSION_MANIFEST);
    const manifest: VersionManifest = await manifestRes.json();

    console.log(`Found ${manifest.versions.length} Minecraft versions`);

    // Clear existing latest flags
    await clearLatestFlags(project.id);

    // Filter to releases and recent snapshots
    const releases = manifest.versions.filter((v) => v.type === "release");
    const recentSnapshots = manifest.versions
      .filter((v) => v.type === "snapshot")
      .slice(0, 10);

    const versionsToProcess = [...releases, ...recentSnapshots];

    for (const version of versionsToProcess) {
      console.log(`Processing Vanilla ${version.id}...`);

      // Fetch version details to get server download
      const detailsRes = await fetch(version.url);
      const details: VersionDetails = await detailsRes.json();

      if (!details.downloads.server) {
        console.log(`  No server available for ${version.id}`);
        continue;
      }

      const server = details.downloads.server;

      const mcVersionId = await getOrCreateMinecraftVersion(
        version.id,
        version.releaseTime,
        version.type
      );

      await upsertBuild({
        project_id: project.id,
        minecraft_version_id: mcVersionId,
        build_number: 1, // Vanilla has single build per version
        version_string: `vanilla-${version.id}`,
        download_url: server.url,
        file_name: `server-${version.id}.jar`,
        file_size: server.size,
        sha256: undefined, // Mojang provides SHA1
        md5: undefined,
        stability: version.type === "release" ? "stable" : "snapshot",
        release_date: version.releaseTime,
        metadata: {
          sha1: server.sha1,
          type: version.type,
        },
      });

      buildsAdded++;

      // Small delay
      await new Promise((r) => setTimeout(r, 50));
    }

    // Mark latest builds
    await markLatestBuilds(project.id);

    await updateSyncLog(logId, "success", { builds_added: buildsAdded });
    console.log(`Vanilla indexer complete. Added/updated ${buildsAdded} builds.`);
  } catch (error) {
    console.error("Vanilla indexer failed:", error);
    await updateSyncLog(logId, "failed", {
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
    process.exit(1);
  }
}

main();

