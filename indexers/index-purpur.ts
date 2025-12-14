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
import { fetchJson } from "./lib/http";

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

function parsePurpurVersions(value: unknown): PurpurVersions {
  if (!value || typeof value !== "object") return { versions: [] };
  const maybe = value as { versions?: unknown };
  if (!Array.isArray(maybe.versions)) return { versions: [] };
  return {
    versions: maybe.versions.filter((v): v is string => typeof v === "string"),
  };
}

function parsePurpurBuilds(value: unknown): PurpurBuilds {
  if (!value || typeof value !== "object") {
    return { builds: { all: [], latest: "" } };
  }
  const maybe = value as { builds?: unknown };
  const buildsObj =
    maybe.builds && typeof maybe.builds === "object"
      ? (maybe.builds as Record<string, unknown>)
      : {};
  const allRaw = buildsObj.all;
  const latestRaw = buildsObj.latest;
  const all = Array.isArray(allRaw)
    ? allRaw.filter((v): v is string => typeof v === "string")
    : [];
  const latest = typeof latestRaw === "string" ? latestRaw : "";
  return { builds: { all, latest } };
}

function parsePurpurBuild(value: unknown): PurpurBuild | null {
  if (!value || typeof value !== "object") return null;
  const maybe = value as Partial<PurpurBuild>;
  if (
    typeof maybe.build !== "string" ||
    typeof maybe.result !== "string" ||
    typeof maybe.timestamp !== "number" ||
    typeof maybe.duration !== "number" ||
    typeof maybe.md5 !== "string" ||
    !Array.isArray(maybe.commits)
  ) {
    return null;
  }
  // Ensure commit entries are objects to avoid crashes in map()
  maybe.commits = maybe.commits.filter(
    (c): c is PurpurBuild["commits"][number] => {
      if (!c || typeof c !== "object") return false;
      const obj = c as Record<string, unknown>;
      return (
        typeof obj.description === "string" &&
        typeof obj.author === "string" &&
        typeof obj.hash === "string" &&
        typeof obj.timestamp === "number"
      );
    }
  );
  return maybe as PurpurBuild;
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
    const versionsData = await fetchJson(`${PURPUR_API}/purpur`, {
      parse: parsePurpurVersions,
    });

    console.log(`Found ${versionsData.versions.length} Purpur versions`);

    // Clear existing latest flags
    await clearLatestFlags(project.id);

    // Process recent versions
    const recentVersions = versionsData.versions.slice(-15);

    for (const version of recentVersions) {
      console.log(`Processing Purpur ${version}...`);

      const mcVersionId = await getOrCreateMinecraftVersion(version);

      // Get builds for this version
      const buildsData = await fetchJson(`${PURPUR_API}/purpur/${version}`, {
        parse: parsePurpurBuilds,
      });

      // Get last 5 builds
      const recentBuilds = buildsData.builds.all.slice(-5);

      for (const buildNum of recentBuilds) {
        const buildDetails = await fetchJson(
          `${PURPUR_API}/purpur/${version}/${buildNum}`,
          { parse: parsePurpurBuild }
        );
        if (!buildDetails) continue;

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

