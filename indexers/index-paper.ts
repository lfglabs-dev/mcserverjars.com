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
import { fetchJson, HttpError } from "./lib/http";

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

function parseVersionsResponse(value: unknown): { versions: string[] } {
  if (!value || typeof value !== "object") {
    return { versions: [] };
  }
  const maybe = value as { versions?: unknown };
  const versions = maybe.versions;
  if (!Array.isArray(versions)) return { versions: [] };
  return { versions: versions.filter((v): v is string => typeof v === "string") };
}

function parseBuildsResponse(value: unknown): { builds: number[] } {
  if (!value || typeof value !== "object") {
    return { builds: [] };
  }
  const maybe = value as { builds?: unknown };
  const builds = maybe.builds;
  if (!Array.isArray(builds)) return { builds: [] };
  return { builds: builds.filter((b): b is number => typeof b === "number") };
}

function parseBuildDetails(value: unknown): PaperBuild | null {
  if (!value || typeof value !== "object") return null;
  const maybe = value as Partial<PaperBuild>;
  if (
    typeof maybe.build !== "number" ||
    typeof maybe.time !== "string" ||
    typeof maybe.channel !== "string" ||
    typeof maybe.promoted !== "boolean" ||
    !maybe.downloads?.application ||
    typeof maybe.downloads.application.name !== "string" ||
    typeof maybe.downloads.application.sha256 !== "string" ||
    !Array.isArray(maybe.changes)
  ) {
    return null;
  }
  return maybe as PaperBuild;
}

function isStableMinecraftVersion(version: string): boolean {
  // PaperMC sometimes includes pre/rc tags (e.g. `1.21.11-rc3`) in the versions list,
  // but those do not have a corresponding `/versions/{version}` endpoint.
  // We only index stable release versions here.
  return /^\d+\.\d+(\.\d+)?$/.test(version);
}

async function fetchVersions(): Promise<string[]> {
  const data = await fetchJson(`${PAPER_API}/projects/paper`, {
    parse: parseVersionsResponse,
  });
  return data.versions;
}

async function fetchBuildsForVersion(version: string): Promise<number[]> {
  try {
    const data = await fetchJson(`${PAPER_API}/projects/paper/versions/${version}`, {
      parse: parseBuildsResponse,
    });
    return data.builds;
  } catch (error) {
    // PaperMC occasionally advertises versions that don't expose this endpoint (404).
    if (error instanceof HttpError && error.status === 404) {
      console.warn(`Skipping Paper version ${version} (no builds endpoint)`);
      return [];
    }
    throw error;
  }
}

async function fetchBuildDetails(
  version: string,
  build: number
): Promise<PaperBuild | null> {
  return await fetchJson(`${PAPER_API}/projects/paper/versions/${version}/builds/${build}`, {
    parse: parseBuildDetails,
  });
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
    const stableVersions = versions.filter(isStableMinecraftVersion);
    console.log(
      `Found ${versions.length} Paper versions (${stableVersions.length} stable)`
    );

    // Clear existing latest flags
    await clearLatestFlags(project.id);

    // Process recent versions (limit for efficiency)
    const recentVersions = stableVersions.slice(-20); // Last 20 stable versions

    for (const version of recentVersions) {
      console.log(`Processing Paper ${version}...`);

      const mcVersionId = await getOrCreateMinecraftVersion(version);
      const builds = await fetchBuildsForVersion(version);
      if (builds.length === 0) continue;

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

