/**
 * Spigot/CraftBukkit Indexer
 *
 * Triggers builds via the backend API which runs BuildTools.
 * Builds one version at a time, waiting for each to complete.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const API_URL = process.env.API_URL || "https://api.mcserverjars.com";

// Build timeout: 10 minutes per build
const BUILD_TIMEOUT_MS = 10 * 60 * 1000;
// Poll interval: check every 15 seconds
const POLL_INTERVAL_MS = 15 * 1000;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Versions that BuildTools supports (newest first)
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

interface BuildStatusResponse {
  builds_in_progress: string[];
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

async function getBuildStatus(): Promise<BuildStatusResponse> {
  try {
    const response = await fetch(`${API_URL}/v1/build/status`);
    if (!response.ok) {
      return { builds_in_progress: [] };
    }
    return (await response.json()) as BuildStatusResponse;
  } catch {
    return { builds_in_progress: [] };
  }
}

async function waitForBuildToComplete(buildKey: string): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < BUILD_TIMEOUT_MS) {
    const status = await getBuildStatus();

    if (!status.builds_in_progress.includes(buildKey)) {
      // Build is no longer in progress - it completed
      return true;
    }

    console.log(
      `    Waiting for ${buildKey}... (${Math.round(
        (Date.now() - startTime) / 1000
      )}s)`
    );
    await sleep(POLL_INTERVAL_MS);
  }

  console.error(`    Timeout waiting for ${buildKey}`);
  return false;
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

    // Handle various status codes
    if (response.status === 503) {
      // Server busy - return status so we can wait
      return { status: "busy", message: "Server is busy with another build" };
    }

    if (!response.ok) {
      const text = await response.text();
      // Don't log full HTML errors
      const shortText =
        text.length > 100 ? text.substring(0, 100) + "..." : text;
      return {
        status: "error",
        message: `HTTP ${response.status}: ${shortText}`,
      };
    }

    return (await response.json()) as BuildResponse;
  } catch (error) {
    return { status: "error", message: String(error) };
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function triggerAndWait(
  version: string,
  buildType: "spigot" | "craftbukkit"
): Promise<"completed" | "exists" | "failed"> {
  const buildKey = `${buildType}-${version}`;

  // Check if server is busy and wait
  let retries = 0;
  while (retries < 60) {
    // Max 60 retries = 15 min waiting for busy server
    const result = await triggerBuild(version, buildType);

    if (result.status === "started") {
      console.log(`    Build started: ${buildKey}`);
      const completed = await waitForBuildToComplete(buildKey);
      return completed ? "completed" : "failed";
    }

    if (result.status === "exists") {
      return "exists";
    }

    if (result.status === "busy") {
      console.log(`    Server busy, waiting 15s...`);
      await sleep(15000);
      retries++;
      continue;
    }

    if (result.status === "in_progress") {
      console.log(`    Already in progress, waiting...`);
      const completed = await waitForBuildToComplete(buildKey);
      return completed ? "completed" : "failed";
    }

    // Error
    console.error(`    Build failed: ${result.message}`);
    return "failed";
  }

  console.error(`    Gave up waiting for server to be available`);
  return "failed";
}

async function indexSpigot(): Promise<void> {
  console.log("Starting Spigot/CraftBukkit indexer...");
  console.log(`API URL: ${API_URL}`);
  console.log(`Build timeout: ${BUILD_TIMEOUT_MS / 60000} minutes`);

  const spigotId = await getProjectId("spigot");
  const craftbukkitId = await getProjectId("craftbukkit");

  if (!spigotId || !craftbukkitId) {
    console.error("Could not find Spigot or CraftBukkit project IDs");
    return;
  }

  console.log(`Found ${SUPPORTED_VERSIONS.length} supported versions\n`);

  let buildsCompleted = 0;
  let buildsExisted = 0;
  let buildsFailed = 0;

  // Process versions one at a time
  for (const version of SUPPORTED_VERSIONS) {
    const mcVersionId = await getMinecraftVersionId(version);
    if (!mcVersionId) {
      console.log(`Skipping ${version} - no MC version record`);
      continue;
    }

    // Check and build Spigot
    const spigotExists = await checkBuildExists(spigotId, mcVersionId);
    if (!spigotExists) {
      console.log(`Building Spigot ${version}...`);
      const result = await triggerAndWait(version, "spigot");
      if (result === "completed") {
        buildsCompleted++;
        console.log(`    ✓ Spigot ${version} completed`);
      } else if (result === "exists") {
        buildsExisted++;
      } else {
        buildsFailed++;
        console.log(`    ✗ Spigot ${version} failed`);
      }
    } else {
      buildsExisted++;
    }

    // Check and build CraftBukkit
    const craftbukkitExists = await checkBuildExists(
      craftbukkitId,
      mcVersionId
    );
    if (!craftbukkitExists) {
      console.log(`Building CraftBukkit ${version}...`);
      const result = await triggerAndWait(version, "craftbukkit");
      if (result === "completed") {
        buildsCompleted++;
        console.log(`    ✓ CraftBukkit ${version} completed`);
      } else if (result === "exists") {
        buildsExisted++;
      } else {
        buildsFailed++;
        console.log(`    ✗ CraftBukkit ${version} failed`);
      }
    } else {
      buildsExisted++;
    }
  }

  console.log(`\n========================================`);
  console.log(`Spigot/CraftBukkit indexer complete.`);
  console.log(`  Builds completed: ${buildsCompleted}`);
  console.log(`  Already existed: ${buildsExisted}`);
  console.log(`  Failed: ${buildsFailed}`);
  console.log(`========================================`);
}

// Build a single version (both Spigot and CraftBukkit)
async function indexSingleVersion(version: string): Promise<void> {
  console.log(`Building Spigot and CraftBukkit for version ${version}...`);
  console.log(`API URL: ${API_URL}\n`);

  console.log(`Building Spigot ${version}...`);
  const spigotResult = await triggerAndWait(version, "spigot");
  console.log(`  Spigot ${version}: ${spigotResult}`);

  console.log(`Building CraftBukkit ${version}...`);
  const craftbukkitResult = await triggerAndWait(version, "craftbukkit");
  console.log(`  CraftBukkit ${version}: ${craftbukkitResult}`);
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
