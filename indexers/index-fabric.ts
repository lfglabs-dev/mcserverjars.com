/**
 * Fabric Indexer
 * Fetches Fabric server loader from Fabric Meta API
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

const FABRIC_META = "https://meta.fabricmc.net/v2";

interface FabricGameVersion {
  version: string;
  stable: boolean;
}

interface FabricLoader {
  separator: string;
  build: number;
  maven: string;
  version: string;
  stable: boolean;
}

interface FabricInstaller {
  url: string;
  maven: string;
  version: string;
  stable: boolean;
}

async function main() {
  console.log("Starting Fabric indexer...");

  const project = await getProjectBySlug("fabric");
  if (!project) {
    console.error("Fabric project not found in database");
    process.exit(1);
  }

  const logId = await createSyncLog(project.id);
  let buildsAdded = 0;

  try {
    // Get game versions
    const gameVersionsRes = await fetch(`${FABRIC_META}/versions/game`);
    const gameVersions: FabricGameVersion[] = await gameVersionsRes.json();

    // Get loader versions
    const loaderRes = await fetch(`${FABRIC_META}/versions/loader`);
    const loaders: FabricLoader[] = await loaderRes.json();

    // Get installer versions
    const installerRes = await fetch(`${FABRIC_META}/versions/installer`);
    const installers: FabricInstaller[] = await installerRes.json();

    const latestLoader = loaders.find((l) => l.stable) || loaders[0];
    const latestInstaller = installers.find((i) => i.stable) || installers[0];

    console.log(
      `Found ${gameVersions.length} Minecraft versions, loader ${latestLoader.version}`
    );

    // Clear existing latest flags
    await clearLatestFlags(project.id);

    // Process stable game versions
    const stableVersions = gameVersions.filter((v) => v.stable).slice(0, 20);

    for (const gameVersion of stableVersions) {
      console.log(`Processing Fabric ${gameVersion.version}...`);

      const mcVersionId = await getOrCreateMinecraftVersion(gameVersion.version);

      // Fabric server launcher URL
      // Format: /v2/versions/loader/:game_version/:loader_version/:installer_version/server/jar
      const downloadUrl = `${FABRIC_META}/versions/loader/${gameVersion.version}/${latestLoader.version}/${latestInstaller.version}/server/jar`;
      const fileName = `fabric-server-mc.${gameVersion.version}-loader.${latestLoader.version}-launcher.${latestInstaller.version}.jar`;

      await upsertBuild({
        project_id: project.id,
        minecraft_version_id: mcVersionId,
        build_number: latestLoader.build,
        version_string: `fabric-${gameVersion.version}-${latestLoader.version}`,
        download_url: downloadUrl,
        file_name: fileName,
        stability: "stable",
        metadata: {
          loader_version: latestLoader.version,
          installer_version: latestInstaller.version,
        },
      });

      buildsAdded++;
    }

    // Mark latest builds
    await markLatestBuilds(project.id);

    await updateSyncLog(logId, "success", { builds_added: buildsAdded });
    console.log(`Fabric indexer complete. Added/updated ${buildsAdded} builds.`);
  } catch (error) {
    console.error("Fabric indexer failed:", error);
    await updateSyncLog(logId, "failed", {
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
    process.exit(1);
  }
}

main();

