/**
 * Folia Indexer
 * Fetches build metadata from PaperMC API (Folia project) and stores in Supabase.
 *
 * PaperMC API docs: https://api.papermc.io/swagger-ui/index.html
 */

import {
  getOrCreateMinecraftVersion,
  upsertBuild,
  createSyncLog,
  updateSyncLog,
  clearLatestFlags,
  markLatestBuilds,
  getProjectBySlugOptional,
  upsertProject,
} from "./lib/supabase";

const PAPERMC_API = "https://api.papermc.io/v2";
const PROJECT_SLUG = "folia";

interface PaperMcProjectResponse {
  versions: string[];
}

interface PaperMcVersionResponse {
  builds: number[];
}

interface PaperMcBuild {
  build: number;
  time: string;
  channel: string;
  promoted: boolean;
  changes: { commit: string; summary: string; message: string }[];
  downloads: {
    application?: {
      name: string;
      sha256: string;
    };
  };
}

async function fetchVersions(): Promise<string[]> {
  const res = await fetch(`${PAPERMC_API}/projects/${PROJECT_SLUG}`);
  if (!res.ok) return [];
  const data = (await res.json()) as PaperMcProjectResponse;
  return data.versions || [];
}

async function fetchBuildsForVersion(version: string): Promise<number[]> {
  const res = await fetch(
    `${PAPERMC_API}/projects/${PROJECT_SLUG}/versions/${version}`
  );
  if (!res.ok) return [];
  const data = (await res.json()) as PaperMcVersionResponse;
  return data.builds || [];
}

async function fetchBuildDetails(
  version: string,
  build: number
): Promise<PaperMcBuild | null> {
  const res = await fetch(
    `${PAPERMC_API}/projects/${PROJECT_SLUG}/versions/${version}/builds/${build}`
  );
  if (!res.ok) return null;
  return (await res.json()) as PaperMcBuild;
}

async function ensureFoliaProject() {
  const existing = await getProjectBySlugOptional(PROJECT_SLUG);
  if (existing) {
    // Make sure it's active if it exists already.
    if (existing.is_active === false) {
      return await upsertProject({
        slug: PROJECT_SLUG,
        name: existing.name || "Folia",
        description:
          existing.description ||
          "High-performance regionized fork of Paper for Minecraft servers",
        website_url: existing.website_url || "https://papermc.io",
        source_url: existing.source_url || "https://github.com/PaperMC/Folia",
        api_url: existing.api_url || "https://api.papermc.io",
        logo_url: existing.logo_url || null,
        category: existing.category || "server",
        requires_build: existing.requires_build ?? false,
        is_active: true,
        display_order: existing.display_order ?? 6,
      });
    }
    return existing;
  }

  return await upsertProject({
    slug: PROJECT_SLUG,
    name: "Folia",
    description: "High-performance regionized fork of Paper for Minecraft servers",
    website_url: "https://papermc.io",
    source_url: "https://github.com/PaperMC/Folia",
    api_url: "https://api.papermc.io",
    logo_url: null,
    category: "server",
    requires_build: false,
    is_active: true,
    display_order: 6,
  });
}

async function main() {
  console.log("Starting Folia indexer...");

  const project = await ensureFoliaProject();
  if (!project) {
    console.error("Folia project not found and could not be created");
    process.exit(1);
  }

  const logId = await createSyncLog(project.id);
  let buildsAdded = 0;
  let buildsUpdated = 0;

  try {
    const versions = await fetchVersions();
    console.log(`Found ${versions.length} Folia versions`);

    // Clear existing latest flags
    await clearLatestFlags(project.id);

    // Process recent versions (limit for efficiency)
    const recentVersions = versions.slice(-20); // Last 20 versions

    for (const version of recentVersions) {
      console.log(`Processing Folia ${version}...`);

      const mcVersionId = await getOrCreateMinecraftVersion(version);
      const builds = await fetchBuildsForVersion(version);

      // Get last 10 builds per version to limit API calls
      const recentBuilds = builds.slice(-10);

      for (const buildNum of recentBuilds) {
        const buildDetails = await fetchBuildDetails(version, buildNum);
        const application = buildDetails?.downloads?.application;
        if (!buildDetails || !application) continue;

        const downloadName = application.name;
        const downloadUrl = `${PAPERMC_API}/projects/${PROJECT_SLUG}/versions/${version}/builds/${buildNum}/downloads/${downloadName}`;

        await upsertBuild({
          project_id: project.id,
          minecraft_version_id: mcVersionId,
          build_number: buildNum,
          version_string: `${PROJECT_SLUG}-${version}-${buildNum}`,
          download_url: downloadUrl,
          file_name: downloadName,
          sha256: application.sha256,
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

    console.log(`Folia indexer complete. Added/updated ${buildsAdded} builds.`);
  } catch (error) {
    console.error("Folia indexer failed:", error);
    await updateSyncLog(logId, "failed", {
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
    process.exit(1);
  }
}

main();


