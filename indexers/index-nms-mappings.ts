/**
 * NMS Version Mappings Indexer
 *
 * Generates mappings between Minecraft versions and CraftBukkit/Spigot
 * NMS package revisions by:
 * 1. Fetching our already-built Spigot jars from the API
 * 2. Extracting the NMS revision from the CraftServer.class path
 * 3. Falling back to known mappings when jars aren't available
 *
 * Note: The backend now also extracts and stores NMS mappings during builds,
 * so this indexer mainly serves to backfill or verify existing data.
 */

import { createClient } from "@supabase/supabase-js";
import JSZip from "jszip";

/**
 * Known NMS version mappings - verified from actual Spigot jars
 * Updated: 2025-01-xx
 * Source: SpigotMC BuildData / actual jar extraction
 */
const KNOWN_NMS_MAPPINGS: Record<string, string> = {
  // 1.21.x
  "1.21.11": "v1_21_R6",
  "1.21.10": "v1_21_R6",
  "1.21.9": "v1_21_R6",
  "1.21.8": "v1_21_R5",
  "1.21.7": "v1_21_R5",
  "1.21.6": "v1_21_R4",
  "1.21.5": "v1_21_R4",
  "1.21.4": "v1_21_R3",
  "1.21.3": "v1_21_R3",
  "1.21.2": "v1_21_R3",
  "1.21.1": "v1_21_R2",
  "1.21": "v1_21_R1",
  // 1.20.x
  "1.20.6": "v1_20_R4",
  "1.20.5": "v1_20_R4",
  "1.20.4": "v1_20_R3",
  "1.20.3": "v1_20_R3",
  "1.20.2": "v1_20_R2",
  "1.20.1": "v1_20_R1",
  "1.20": "v1_20_R1",
  // 1.19.x
  "1.19.4": "v1_19_R3",
  "1.19.3": "v1_19_R2",
  "1.19.2": "v1_19_R1",
  "1.19.1": "v1_19_R1",
  "1.19": "v1_19_R1",
  // 1.18.x
  "1.18.2": "v1_18_R2",
  "1.18.1": "v1_18_R1",
  "1.18": "v1_18_R1",
  // 1.17.x
  "1.17.1": "v1_17_R1",
  "1.17": "v1_17_R1",
  // Legacy (pre-1.17)
  "1.16.5": "v1_16_R3",
  "1.16.4": "v1_16_R3",
  "1.16.3": "v1_16_R2",
  "1.16.2": "v1_16_R2",
  "1.16.1": "v1_16_R1",
  "1.15.2": "v1_15_R1",
  "1.14.4": "v1_14_R1",
  "1.13.2": "v1_13_R2",
  "1.13": "v1_13_R1",
  "1.12.2": "v1_12_R1",
  "1.11.2": "v1_11_R1",
  "1.10.2": "v1_10_R1",
  "1.9.4": "v1_9_R2",
  "1.9": "v1_9_R1",
  "1.8.8": "v1_8_R3",
  "1.8": "v1_8_R1",
};

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const API_URL = process.env.API_URL || "https://api.mcserverjars.com";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Regex to find CraftServer.class and extract NMS revision
const CRAFTSERVER_PATTERN =
  /^org\/bukkit\/craftbukkit\/(v\d+_\d+_R\d+)\/CraftServer\.class$/;

/**
 * Extract NMS revision from a jar file
 */
async function extractNmsRevision(
  jarBuffer: ArrayBuffer
): Promise<string | null> {
  try {
    const zip = await JSZip.loadAsync(jarBuffer);

    for (const fileName of Object.keys(zip.files)) {
      const match = fileName.match(CRAFTSERVER_PATTERN);
      if (match) {
        return match[1];
      }
    }
    return null;
  } catch (error) {
    console.log(`    Error parsing jar: ${error}`);
    return null;
  }
}

/**
 * Try to get NMS revision from our built Spigot jar
 */
async function getNmsRevisionFromApi(version: string): Promise<string | null> {
  const url = `${API_URL}/jars/spigot/${version}/spigot-${version}.jar`;

  try {
    console.log(`    Fetching: ${url}`);
    const response = await fetch(url, {
      headers: { "User-Agent": "MCServerJars-NMS-Indexer/1.0" },
    });

    if (!response.ok) {
      console.log(`    Not found (${response.status})`);
      return null;
    }

    const contentType = response.headers.get("content-type");
    if (
      !contentType?.includes("application/java-archive") &&
      !contentType?.includes("application/octet-stream")
    ) {
      console.log(`    Not a jar (content-type: ${contentType})`);
      return null;
    }

    const buffer = await response.arrayBuffer();
    console.log(
      `    Downloaded ${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB`
    );

    const revision = await extractNmsRevision(buffer);
    if (revision) {
      console.log(`    Extracted: ${revision}`);
    }
    return revision;
  } catch (error) {
    console.log(`    Error: ${error}`);
    return null;
  }
}

/**
 * Get all Minecraft versions that have Spigot builds
 */
async function getSpigotVersions(): Promise<string[]> {
  const { data: project } = await supabase
    .from("jar_projects")
    .select("id")
    .eq("slug", "spigot")
    .single();

  if (!project) {
    console.error("Spigot project not found");
    return [];
  }

  const { data: builds } = await supabase
    .from("jar_builds")
    .select("minecraft_versions(version)")
    .eq("project_id", project.id);

  if (!builds) return [];

  const versions = new Set<string>();
  for (const build of builds) {
    const mcVersion = build.minecraft_versions as unknown as {
      version: string;
    } | null;
    if (mcVersion?.version) {
      versions.add(mcVersion.version);
    }
  }

  // Sort versions (newest first)
  return [...versions].sort((a, b) => {
    const aParts = a.split(".").map(Number);
    const bParts = b.split(".").map(Number);
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const diff = (bParts[i] || 0) - (aParts[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  });
}

interface NmsMappingRow {
  minecraft_version: string;
  nms_revision: string;
  craftbukkit_package: string;
  spigot_version: string;
  is_latest_for_revision: boolean;
}

async function indexNmsMappings(): Promise<void> {
  console.log("Starting NMS version mappings indexer...");
  console.log(`API URL: ${API_URL}\n`);

  // Get versions with Spigot builds
  const versions = await getSpigotVersions();
  console.log(`Found ${versions.length} versions with Spigot builds\n`);

  const mappings: NmsMappingRow[] = [];
  const revisionToVersions: Record<string, string[]> = {};

  for (const mcVersion of versions) {
    console.log(`Processing ${mcVersion}...`);

    // Check if we already have this mapping in the database
    const { data: existing } = await supabase
      .from("nms_version_mappings")
      .select("nms_revision")
      .eq("minecraft_version", mcVersion)
      .single();

    let revision: string | null = null;

    if (existing?.nms_revision) {
      revision = existing.nms_revision;
      console.log(`  Already in DB: ${revision}`);
    } else {
      // Try to extract from our built jar
      revision = await getNmsRevisionFromApi(mcVersion);
      
      // Fall back to known mappings if jar isn't available
      if (!revision && KNOWN_NMS_MAPPINGS[mcVersion]) {
        revision = KNOWN_NMS_MAPPINGS[mcVersion];
        console.log(`  Using known mapping: ${revision}`);
      }
    }

    if (!revision) {
      console.log(`  Could not determine NMS revision`);
      continue;
    }

    // Track for is_latest calculation
    if (!revisionToVersions[revision]) {
      revisionToVersions[revision] = [];
    }
    revisionToVersions[revision].push(mcVersion);

    mappings.push({
      minecraft_version: mcVersion,
      nms_revision: revision,
      craftbukkit_package: `org.bukkit.craftbukkit.${revision}`,
      spigot_version: `${mcVersion}-R0.1-SNAPSHOT`,
      is_latest_for_revision: false,
    });
  }

  // Determine which version is latest for each revision
  for (const [revision, mcVersions] of Object.entries(revisionToVersions)) {
    mcVersions.sort((a, b) => {
      const aParts = a.split(".").map(Number);
      const bParts = b.split(".").map(Number);
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const diff = (bParts[i] || 0) - (aParts[i] || 0);
        if (diff !== 0) return diff;
      }
      return 0;
    });
    const latestVersion = mcVersions[0];

    const mapping = mappings.find((m) => m.minecraft_version === latestVersion);
    if (mapping) {
      mapping.is_latest_for_revision = true;
    }
  }

  // Upsert all mappings
  console.log(`\nUpserting ${mappings.length} mappings to database...`);

  for (const mapping of mappings) {
    const { error } = await supabase.from("nms_version_mappings").upsert(
      {
        minecraft_version: mapping.minecraft_version,
        nms_revision: mapping.nms_revision,
        craftbukkit_package: mapping.craftbukkit_package,
        spigot_version: mapping.spigot_version,
        is_latest_for_revision: mapping.is_latest_for_revision,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "minecraft_version",
      }
    );

    if (error) {
      console.error(`Error upserting ${mapping.minecraft_version}:`, error);
    }
  }

  // Print summary grouped by revision
  console.log("\n" + "=".repeat(60));
  console.log("NMS Version Mappings Summary");
  console.log("=".repeat(60));

  const byRevision: Record<string, string[]> = {};
  for (const mapping of mappings) {
    if (!byRevision[mapping.nms_revision]) {
      byRevision[mapping.nms_revision] = [];
    }
    byRevision[mapping.nms_revision].push(mapping.minecraft_version);
  }

  const sortedRevisions = Object.keys(byRevision).sort((a, b) => {
    const parseRev = (r: string) => {
      const match = r.match(/v(\d+)_(\d+)_R(\d+)/);
      if (!match) return [0, 0, 0];
      return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    };
    const [aMaj, aMin, aRev] = parseRev(a);
    const [bMaj, bMin, bRev] = parseRev(b);
    return bMaj - aMaj || bMin - aMin || bRev - aRev;
  });

  for (const revision of sortedRevisions) {
    const vers = byRevision[revision].sort((a, b) => {
      const aParts = a.split(".").map(Number);
      const bParts = b.split(".").map(Number);
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const diff = (bParts[i] || 0) - (aParts[i] || 0);
        if (diff !== 0) return diff;
      }
      return 0;
    });
    console.log(`${revision.padEnd(12)} => ${vers.join(", ")}`);
  }

  console.log("=".repeat(60));
  console.log(`\nComplete. Processed ${mappings.length} mappings.`);
}

indexNmsMappings().catch(console.error);
