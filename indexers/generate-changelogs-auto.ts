/**
 * Auto-generate changelogs for new Minecraft versions
 * This script:
 * 1. Fetches recent Minecraft versions from launcher manifest
 * 2. Checks which versions don't have changelogs yet
 * 3. Generates changelogs for new versions
 */

import { createClient } from "@supabase/supabase-js";
import { spawn } from "child_process";
import path from "path";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface MinecraftVersion {
  id: string;
  type: string;
  releaseTime: string;
}

async function getRecentMinecraftVersions(): Promise<MinecraftVersion[]> {
  try {
    const response = await fetch(
      "https://launchermeta.mojang.com/mc/game/version_manifest_v2.json"
    );
    const data = await response.json();
    
    // Get recent release versions (last 10)
    const releases = data.versions
      .filter((v: MinecraftVersion) => v.type === "release")
      .slice(0, 10);
    
    return releases;
  } catch (error) {
    console.error("Error fetching Minecraft versions:", error);
    return [];
  }
}

async function getExistingChangelogs(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("changelogs")
    .select("version, project")
    .order("version", { ascending: false });

  if (error) {
    console.error("Error fetching existing changelogs:", error);
    return new Set();
  }

  // Create a set of "version-project" keys
  const existing = new Set<string>();
  for (const row of data || []) {
    existing.add(`${row.version}-${row.project}`);
  }

  return existing;
}

function getPreviousVersion(versions: string[], current: string): string | undefined {
  const idx = versions.indexOf(current);
  if (idx === -1 || idx >= versions.length - 1) return undefined;
  return versions[idx + 1];
}

async function generateChangelog(
  version: string,
  previousVersion: string | undefined,
  project: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      "run",
      "generate-changelogs.ts",
      version,
      previousVersion || version,
      project,
    ];

    console.log(`  Running: bun ${args.join(" ")}`);

    const child = spawn("bun", args, {
      cwd: path.dirname(new URL(import.meta.url).pathname),
      env: {
        ...process.env,
        STORE_CHANGELOGS: "true",
      },
      stdio: "inherit",
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });

    child.on("error", reject);
  });
}

async function main() {
  console.log("=== Auto Changelog Generator ===\n");

  // Get recent Minecraft versions
  const mcVersions = await getRecentMinecraftVersions();
  console.log(`Found ${mcVersions.length} recent Minecraft versions`);

  // Get existing changelogs
  const existing = await getExistingChangelogs();
  console.log(`Found ${existing.size} existing changelog entries`);

  // Find versions that need changelogs
  const versionIds = mcVersions.map((v) => v.id);
  const projects = ["vanilla", "paper", "spigot"];

  for (const version of versionIds) {
    for (const project of projects) {
      const key = `${version}-${project}`;
      
      if (existing.has(key)) {
        console.log(`✓ ${key} already exists`);
        continue;
      }

      const previousVersion = getPreviousVersion(versionIds, version);
      console.log(`\n→ Generating ${key} (from ${previousVersion || "none"})...`);

      try {
        await generateChangelog(version, previousVersion, project);
        console.log(`✓ Generated ${key}`);
        
        // Add delay to avoid rate limiting
        await new Promise((r) => setTimeout(r, 2000));
      } catch (error) {
        console.error(`✗ Failed to generate ${key}:`, error);
      }
    }
  }

  console.log("\n=== Done ===");
}

main().catch(console.error);

