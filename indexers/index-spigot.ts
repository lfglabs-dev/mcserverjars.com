/**
 * Spigot/CraftBukkit Indexer
 *
 * Triggers builds via the backend API which runs BuildTools.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const API_URL = process.env.API_URL || "https://api.mcserverjars.com";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Versions that BuildTools supports
const SUPPORTED_VERSIONS = [
  "1.21.4",
  "1.21.3",
  "1.21.1",
  "1.21",
  "1.20.6",
  "1.20.4",
  "1.20.2",
  "1.20.1",
  "1.20",
  "1.19.4",
  "1.19.3",
  "1.19.2",
  "1.19.1",
  "1.19",
  "1.18.2",
  "1.18.1",
  "1.18",
  "1.17.1",
  "1.17",
  "1.16.5",
  "1.16.4",
  "1.16.3",
  "1.16.2",
  "1.16.1",
  "1.15.2",
  "1.15.1",
  "1.15",
  "1.14.4",
  "1.14.3",
  "1.14.2",
  "1.14.1",
  "1.14",
  "1.13.2",
  "1.13.1",
  "1.13",
  "1.12.2",
  "1.12.1",
  "1.12",
  "1.11.2",
  "1.11.1",
  "1.11",
  "1.10.2",
  "1.10",
  "1.9.4",
  "1.9.2",
  "1.9",
  "1.8.8",
  "1.8.3",
  "1.8",
];

interface BuildResponse {
  status: string;
  message: string;
  build_key?: string;
}

async function getProjectId(slug: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("jar_projects")
    .select("id")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    console.error(`Project ${slug} not found:`, error);
    return null;
  }

  return data.id;
}

async function getMinecraftVersionId(version: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("minecraft_versions")
    .select("id")
    .eq("version", version)
    .single();

  if (error || !data) {
    return null;
  }

  return data.id;
}

async function checkBuildExists(
  projectId: string,
  minecraftVersionId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("jar_builds")
    .select("id")
    .eq("project_id", projectId)
    .eq("minecraft_version_id", minecraftVersionId)
    .limit(1);

  if (error) {
    console.error("Error checking build:", error);
    return false;
  }

  return data && data.length > 0;
}

async function triggerBuild(
  version: string,
  buildType: "spigot" | "craftbukkit"
): Promise<BuildResponse> {
  try {
    const response = await fetch(`${API_URL}/v1/build`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        version,
        build_type: buildType,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`  Failed to trigger build: ${response.status} - ${text}`);
      return { status: "error", message: text };
    }

    return (await response.json()) as BuildResponse;
  } catch (error) {
    console.error(`  Error triggering build:`, error);
    return { status: "error", message: String(error) };
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function indexSpigot(): Promise<void> {
  console.log("Starting Spigot/CraftBukkit indexer...");
  console.log(`API URL: ${API_URL}`);

  const spigotId = await getProjectId("spigot");
  const craftbukkitId = await getProjectId("craftbukkit");

  if (!spigotId || !craftbukkitId) {
    console.error("Could not find Spigot or CraftBukkit project IDs");
    return;
  }

  console.log(`Found ${SUPPORTED_VERSIONS.length} supported versions`);

  let buildsTriggered = 0;
  let buildsSkipped = 0;
  let buildsInProgress = 0;

  // Process versions from newest to oldest
  for (const version of SUPPORTED_VERSIONS) {
    const mcVersionId = await getMinecraftVersionId(version);
    if (!mcVersionId) {
      console.log(`  Skipping ${version} - no MC version record`);
      continue;
    }

    // Check Spigot
    const spigotExists = await checkBuildExists(spigotId, mcVersionId);
    if (!spigotExists) {
      console.log(`  Triggering Spigot ${version}...`);
      const result = await triggerBuild(version, "spigot");
      console.log(`    ${result.status}: ${result.message}`);

      if (result.status === "started") {
        buildsTriggered++;
        // Wait a bit to not overwhelm the API
        await sleep(1000);
      } else if (result.status === "in_progress") {
        buildsInProgress++;
      } else {
        buildsSkipped++;
      }
    }

    // Check CraftBukkit
    const craftbukkitExists = await checkBuildExists(
      craftbukkitId,
      mcVersionId
    );
    if (!craftbukkitExists) {
      console.log(`  Triggering CraftBukkit ${version}...`);
      const result = await triggerBuild(version, "craftbukkit");
      console.log(`    ${result.status}: ${result.message}`);

      if (result.status === "started") {
        buildsTriggered++;
        await sleep(1000);
      } else if (result.status === "in_progress") {
        buildsInProgress++;
      } else {
        buildsSkipped++;
      }
    }
  }

  console.log(`\nSpigot/CraftBukkit indexer complete.`);
  console.log(`  Builds triggered: ${buildsTriggered}`);
  console.log(`  Builds in progress: ${buildsInProgress}`);
  console.log(`  Builds skipped/existing: ${buildsSkipped}`);

  if (buildsTriggered > 0) {
    console.log(
      `\nNote: Builds run in the background. Each takes 5-10 minutes.`
    );
    console.log(`Check progress at: ${API_URL}/v1/build/status`);
  }
}

// Only trigger a few builds at a time to avoid overwhelming the server
async function indexSingleVersion(version: string): Promise<void> {
  console.log(`Building Spigot and CraftBukkit for version ${version}...`);

  const spigotResult = await triggerBuild(version, "spigot");
  console.log(
    `Spigot ${version}: ${spigotResult.status} - ${spigotResult.message}`
  );

  const craftbukkitResult = await triggerBuild(version, "craftbukkit");
  console.log(
    `CraftBukkit ${version}: ${craftbukkitResult.status} - ${craftbukkitResult.message}`
  );
}

// Check command line args
const args = process.argv.slice(2);
if (args.length > 0 && args[0] !== "--all") {
  // Build specific version
  indexSingleVersion(args[0]).catch(console.error);
} else {
  // Full index
  indexSpigot().catch(console.error);
}
