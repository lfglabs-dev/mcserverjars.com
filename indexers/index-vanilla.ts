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
import { fetchJson } from "./lib/http";

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

function parseVersionManifest(value: unknown): VersionManifest {
  if (!value || typeof value !== "object") {
    return { latest: { release: "", snapshot: "" }, versions: [] };
  }
  const maybe = value as Partial<VersionManifest>;
  const versionsRaw = Array.isArray(maybe.versions) ? maybe.versions : [];
  const versions = versionsRaw
    .filter((v): v is VersionManifest["versions"][number] => {
      if (!v || typeof v !== "object") return false;
      const obj = v as Record<string, unknown>;
      return (
        typeof obj.id === "string" &&
        typeof obj.type === "string" &&
        typeof obj.url === "string" &&
        typeof obj.releaseTime === "string" &&
        typeof obj.sha1 === "string"
      );
    })
    .map((v) => v);

  const latest =
    maybe.latest && typeof maybe.latest === "object"
      ? {
          release:
            typeof (maybe.latest as Record<string, unknown>).release === "string"
              ? ((maybe.latest as Record<string, unknown>).release as string)
              : "",
          snapshot:
            typeof (maybe.latest as Record<string, unknown>).snapshot === "string"
              ? ((maybe.latest as Record<string, unknown>).snapshot as string)
              : "",
        }
      : { release: "", snapshot: "" };

  return { latest, versions };
}

function parseVersionDetails(value: unknown): VersionDetails {
  if (!value || typeof value !== "object") {
    return { downloads: {} };
  }
  const maybe = value as { downloads?: unknown };
  const downloads =
    maybe.downloads && typeof maybe.downloads === "object"
      ? (maybe.downloads as Record<string, unknown>)
      : {};
  const server =
    downloads.server && typeof downloads.server === "object"
      ? (downloads.server as Record<string, unknown>)
      : null;

  if (
    server &&
    typeof server.sha1 === "string" &&
    typeof server.size === "number" &&
    typeof server.url === "string"
  ) {
    return {
      downloads: {
        server: {
          sha1: server.sha1,
          size: server.size,
          url: server.url,
        },
      },
    };
  }

  return { downloads: {} };
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
    const manifest = await fetchJson(VERSION_MANIFEST, {
      parse: parseVersionManifest,
    });

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
      const details = await fetchJson(version.url, { parse: parseVersionDetails });

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

