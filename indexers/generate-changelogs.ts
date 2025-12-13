/**
 * Changelog Generator for MCServerJars
 * Generates developer-focused changelogs from:
 * - Official Minecraft changelogs
 * - Paper commits
 * - Spigot/CraftBukkit commits
 */

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Types
interface VersionRefs {
  BuildData: string;
  Bukkit: string;
  CraftBukkit: string;
  Spigot: string;
}

interface SpigotVersionInfo {
  name: string;
  refs: VersionRefs;
  toolsVersion: number;
}

interface Commit {
  message: string;
  author?: string;
  date?: string;
}

interface Changelog {
  version: string;
  project: string;
  summary: string;
  breaking_changes: string[];
  new_features: string[];
  bug_fixes: string[];
  api_changes: string[];
  resource_format_changes: string[];
  developer_notes: string[];
  raw_commits?: string[];
  official_changelog_url?: string;
  generated_at: string;
}

// Fetch Spigot version info
async function getSpigotVersionInfo(
  version: string
): Promise<SpigotVersionInfo | null> {
  try {
    const response = await fetch(
      `https://hub.spigotmc.org/versions/${version}.json`
    );
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

// Fetch commits between two refs from Spigot stash
async function getSpigotCommits(
  repo: "craftbukkit" | "spigot" | "bukkit",
  sinceRef: string,
  untilRef: string
): Promise<Commit[]> {
  try {
    const url = `https://hub.spigotmc.org/stash/rest/api/1.0/projects/SPIGOT/repos/${repo}/commits?since=${sinceRef}&until=${untilRef}&limit=100`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return (data.values || []).map(
      (c: {
        message: string;
        author?: { name: string };
        authorTimestamp?: number;
      }) => ({
        message: c.message,
        author: c.author?.name,
        date: c.authorTimestamp
          ? new Date(c.authorTimestamp).toISOString()
          : undefined,
      })
    );
  } catch {
    return [];
  }
}

// Fetch Paper commits for a version from GitHub
async function getPaperCommits(version: string): Promise<Commit[]> {
  try {
    // Paper uses tags like "ver/1.21.11" for version releases
    // We'll fetch recent commits and filter by message
    const response = await fetch(
      `https://api.github.com/repos/PaperMC/Paper/commits?per_page=100`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "MCServerJars-Indexer",
        },
      }
    );
    if (!response.ok) return [];
    const commits = await response.json();

    // Filter commits related to this version
    const versionCommits: Commit[] = [];
    let foundVersion = false;
    let passedVersion = false;

    for (const commit of commits) {
      const msg = commit.commit.message;
      // Check if this commit mentions the version
      if (msg.includes(version) || msg.includes(`Updated for ${version}`)) {
        foundVersion = true;
      }

      if (foundVersion && !passedVersion) {
        versionCommits.push({
          message: msg,
          author: commit.commit.author?.name,
          date: commit.commit.author?.date,
        });

        // Stop when we hit the previous version update
        if (versionCommits.length > 1 && msg.includes("Updated for 1.")) {
          passedVersion = true;
        }
      }
    }

    return versionCommits.slice(0, 50); // Limit to 50 commits
  } catch (error) {
    console.error("Error fetching Paper commits:", error);
    return [];
  }
}

// Fetch Minecraft version info from Mojang's launcher manifest
async function getMinecraftVersionInfo(
  version: string
): Promise<{ releaseTime: string; type: string } | null> {
  try {
    const manifestResponse = await fetch(
      "https://launchermeta.mojang.com/mc/game/version_manifest_v2.json"
    );
    if (!manifestResponse.ok) return null;

    const manifest = await manifestResponse.json();
    const versionInfo = manifest.versions.find(
      (v: { id: string }) => v.id === version
    );

    if (versionInfo) {
      return {
        releaseTime: versionInfo.releaseTime,
        type: versionInfo.type,
      };
    }
    return null;
  } catch {
    return null;
  }
}

// Get the official changelog URL for a version
function getMinecraftChangelogUrl(version: string): string {
  const urlVersion = version.replace(/\./g, "-");
  return `https://www.minecraft.net/en-us/article/minecraft-java-edition-${urlVersion}`;
}

// Fetch and extract text content from Minecraft.net changelog page
async function fetchMinecraftChangelogContent(version: string): Promise<string | null> {
  try {
    const url = getMinecraftChangelogUrl(version);
    console.log(`  Fetching: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!response.ok) {
      console.log(`  HTTP ${response.status}`);
      return null;
    }

    const html = await response.text();
    
    // Extract text content from the HTML
    let text = html
      // Remove scripts and styles
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, "")
      // Convert common block elements to newlines
      .replace(/<\/?(p|div|h[1-6]|li|br|tr)[^>]*>/gi, "\n")
      // Remove remaining HTML tags
      .replace(/<[^>]+>/g, " ")
      // Decode HTML entities
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Clean up whitespace
      .replace(/\s+/g, " ")
      .replace(/\n\s+/g, "\n")
      .trim();

    // Try to find the changelog section
    const changelogMatch = text.match(/(Technical Changes|Changes in|New Features|Bug Fixes|Experimental|Fixed bugs|CHANGES|FEATURES)[\s\S]{100,10000}/i);
    if (changelogMatch) {
      text = changelogMatch[0];
    }

    // Limit length
    if (text.length > 10000) {
      text = text.slice(0, 10000);
    }

    console.log(`  Extracted ${text.length} chars`);
    return text.length > 200 ? text : null;
  } catch (error) {
    console.error(`  Fetch error:`, error);
    return null;
  }
}

// Generate changelog using GPT
async function generateChangelog(
  version: string,
  project: "vanilla" | "paper" | "spigot",
  commits: Commit[],
  officialChangelog?: string | null,
  previousVersion?: string
): Promise<Changelog> {
  const commitMessages = commits.map((c) => c.message).join("\n");

  const systemPrompt = `You are an expert Minecraft server developer creating changelogs for other developers.
Your changelogs are:
- Concise and actionable
- Focused on what developers need to know
- Highlighting breaking changes, API changes, and resource format changes
- Written for LLM consumption to help with update processes

Output format (JSON):
{
  "summary": "One paragraph summary of the most important changes",
  "breaking_changes": ["List of breaking changes that require code updates"],
  "new_features": ["New features or capabilities added"],
  "bug_fixes": ["Important bug fixes"],
  "api_changes": ["API additions, deprecations, or modifications"],
  "resource_format_changes": ["Changes to data packs, resource packs, NBT formats, etc."],
  "developer_notes": ["Important notes for plugin/mod developers"]
}

Be specific about class names, method signatures, and version numbers when relevant.
If a category has no items, use an empty array.`;

  let userPrompt = `Generate a developer-focused changelog for ${project.toUpperCase()} version ${version}`;

  if (previousVersion) {
    userPrompt += ` (updating from ${previousVersion})`;
  }

  userPrompt += `.\n\n`;

  if (officialChangelog) {
    userPrompt += `OFFICIAL MINECRAFT CHANGELOG:\n${officialChangelog}\n\n`;
  }

  if (commitMessages) {
    userPrompt += `COMMITS:\n${commitMessages}\n\n`;
  }

  userPrompt += `Generate the changelog JSON:`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Using gpt-4o as gpt-5.2 isn't available yet
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from GPT");

    const parsed = JSON.parse(content);

    return {
      version,
      project,
      summary: parsed.summary || "",
      breaking_changes: parsed.breaking_changes || [],
      new_features: parsed.new_features || [],
      bug_fixes: parsed.bug_fixes || [],
      api_changes: parsed.api_changes || [],
      resource_format_changes: parsed.resource_format_changes || [],
      developer_notes: parsed.developer_notes || [],
      raw_commits: commits.map((c) => c.message),
      official_changelog_url:
        project === "vanilla"
          ? `https://www.minecraft.net/en-us/article/minecraft-java-edition-${version.replace(
              /\./g,
              "-"
            )}`
          : undefined,
      generated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error generating changelog:", error);
    // Return a basic changelog if GPT fails
    return {
      version,
      project,
      summary: `Update to ${version}`,
      breaking_changes: [],
      new_features: [],
      bug_fixes: [],
      api_changes: [],
      resource_format_changes: [],
      developer_notes: [],
      raw_commits: commits.map((c) => c.message),
      generated_at: new Date().toISOString(),
    };
  }
}

// Store changelog in database
async function storeChangelog(changelog: Changelog): Promise<void> {
  const { error } = await supabase.from("changelogs").upsert(
    {
      version: changelog.version,
      project: changelog.project,
      summary: changelog.summary,
      breaking_changes: changelog.breaking_changes,
      new_features: changelog.new_features,
      bug_fixes: changelog.bug_fixes,
      api_changes: changelog.api_changes,
      resource_format_changes: changelog.resource_format_changes,
      developer_notes: changelog.developer_notes,
      raw_commits: changelog.raw_commits,
      official_changelog_url: changelog.official_changelog_url,
      generated_at: changelog.generated_at,
    },
    {
      onConflict: "version,project",
    }
  );

  if (error) {
    console.error("Error storing changelog:", error);
    throw error;
  }
}

// Generate changelog for Vanilla (Minecraft)
// Fetches the official changelog page and uses GPT to extract developer-relevant info
async function generateVanillaChangelog(
  version: string,
  previousVersion?: string
): Promise<Changelog> {
  console.log(`Generating Vanilla changelog for ${version}...`);

  const versionInfo = await getMinecraftVersionInfo(version);
  console.log(`  Version info: ${versionInfo ? "found" : "not found"}`);

  // Try to fetch the official changelog content
  const pageContent = await fetchMinecraftChangelogContent(version);
  
  if (pageContent) {
    console.log(`  Page content found, generating with GPT...`);
    // Use GPT to extract developer-relevant information
    return generateChangelog(
      version,
      "vanilla",
      [], // No commits for vanilla
      pageContent, // Use page content as "official changelog"
      previousVersion
    );
  }

  // Fallback if we can't fetch the page
  console.log(`  No page content, creating minimal entry`);
  return {
    version,
    project: "vanilla",
    summary: versionInfo
      ? `Minecraft ${version} (${versionInfo.type}) released on ${new Date(
          versionInfo.releaseTime
        ).toLocaleDateString()}.`
      : `Minecraft ${version} release.`,
    breaking_changes: [],
    new_features: [],
    bug_fixes: [],
    api_changes: [],
    resource_format_changes: [],
    developer_notes: [],
    raw_commits: [],
    official_changelog_url: getMinecraftChangelogUrl(version),
    generated_at: new Date().toISOString(),
  };
}

// Generate changelog for Paper
async function generatePaperChangelog(
  version: string,
  previousVersion?: string
): Promise<Changelog> {
  console.log(`Generating Paper changelog for ${version}...`);

  const commits = await getPaperCommits(version);
  console.log(`  Paper commits: ${commits.length}`);

  return generateChangelog(
    version,
    "paper",
    commits,
    null, // No official changelog needed - commits are the source
    previousVersion
  );
}

// Generate changelog for Spigot
async function generateSpigotChangelog(
  version: string,
  previousVersion?: string
): Promise<Changelog> {
  console.log(`Generating Spigot changelog for ${version}...`);

  const currentInfo = await getSpigotVersionInfo(version);
  const previousInfo = previousVersion
    ? await getSpigotVersionInfo(previousVersion)
    : null;

  if (!currentInfo) {
    console.log(`  No Spigot version info found for ${version}`);
    return generateChangelog(version, "spigot", []);
  }

  let commits: Commit[] = [];

  if (previousInfo) {
    // Get commits between versions
    const cbCommits = await getSpigotCommits(
      "craftbukkit",
      previousInfo.refs.CraftBukkit,
      currentInfo.refs.CraftBukkit
    );
    const spigotCommits = await getSpigotCommits(
      "spigot",
      previousInfo.refs.Spigot,
      currentInfo.refs.Spigot
    );
    const bukkitCommits = await getSpigotCommits(
      "bukkit",
      previousInfo.refs.Bukkit,
      currentInfo.refs.Bukkit
    );

    commits = [
      ...bukkitCommits.map((c) => ({ ...c, message: `[Bukkit] ${c.message}` })),
      ...cbCommits.map((c) => ({
        ...c,
        message: `[CraftBukkit] ${c.message}`,
      })),
      ...spigotCommits.map((c) => ({ ...c, message: `[Spigot] ${c.message}` })),
    ];
  }

  console.log(`  Spigot commits: ${commits.length}`);

  return generateChangelog(
    version,
    "spigot",
    commits,
    null, // No official changelog needed - commits are the source
    previousVersion
  );
}

// Main function - test with specific versions
async function main() {
  const args = process.argv.slice(2);
  const version = args[0] || "1.21.11";
  const previousVersion = args[1] || "1.21.10";
  const project = args[2] || "all";

  console.log(`\n=== Changelog Generator ===`);
  console.log(`Version: ${version}`);
  console.log(`Previous: ${previousVersion}`);
  console.log(`Project: ${project}\n`);

  if (project === "all" || project === "vanilla") {
    const vanillaChangelog = await generateVanillaChangelog(
      version,
      previousVersion
    );
    console.log("\n--- VANILLA CHANGELOG ---");
    console.log(JSON.stringify(vanillaChangelog, null, 2));

    if (process.env.STORE_CHANGELOGS === "true") {
      await storeChangelog(vanillaChangelog);
      console.log("  Stored in database.");
    }
  }

  if (project === "all" || project === "paper") {
    const paperChangelog = await generatePaperChangelog(
      version,
      previousVersion
    );
    console.log("\n--- PAPER CHANGELOG ---");
    console.log(JSON.stringify(paperChangelog, null, 2));

    if (process.env.STORE_CHANGELOGS === "true") {
      await storeChangelog(paperChangelog);
      console.log("  Stored in database.");
    }
  }

  if (project === "all" || project === "spigot") {
    const spigotChangelog = await generateSpigotChangelog(
      version,
      previousVersion
    );
    console.log("\n--- SPIGOT CHANGELOG ---");
    console.log(JSON.stringify(spigotChangelog, null, 2));

    if (process.env.STORE_CHANGELOGS === "true") {
      await storeChangelog(spigotChangelog);
      console.log("  Stored in database.");
    }
  }

  console.log("\n=== Done ===\n");
}

main().catch(console.error);
