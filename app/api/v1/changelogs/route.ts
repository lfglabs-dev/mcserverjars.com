import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

interface ChangelogRow {
  id: string;
  version: string;
  project: string;
  summary: string;
  breaking_changes: string[];
  new_features: string[];
  bug_fixes: string[];
  api_changes: string[];
  resource_format_changes: string[];
  developer_notes: string[];
  raw_commits: string[];
  official_changelog_url: string | null;
  generated_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    
    const project = searchParams.get("project"); // vanilla, paper, spigot
    const from = searchParams.get("from"); // version to start from (excluded)
    const to = searchParams.get("to"); // version to end at (included)
    const limit = parseInt(searchParams.get("limit") || "50");

    let query = supabase
      .from("changelogs")
      .select("*")
      .order("version", { ascending: false })
      .limit(limit);

    if (project) {
      query = query.eq("project", project);
    }

    // Note: Version range filtering requires proper semantic version comparison
    // For now, we'll return all and let the client filter if needed

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const changelogs = (data || []) as ChangelogRow[];

    // If from/to specified, filter the results
    let filtered = changelogs;
    if (from || to) {
      filtered = changelogs.filter((c) => {
        if (from && compareVersions(c.version, from) <= 0) return false;
        if (to && compareVersions(c.version, to) > 0) return false;
        return true;
      });
    }

    return NextResponse.json(
      {
        changelogs: filtered.map((c) => ({
          version: c.version,
          project: c.project,
          summary: c.summary,
          breaking_changes: c.breaking_changes,
          new_features: c.new_features,
          bug_fixes: c.bug_fixes,
          api_changes: c.api_changes,
          resource_format_changes: c.resource_format_changes,
          developer_notes: c.developer_notes,
          official_changelog_url: c.official_changelog_url,
          generated_at: c.generated_at,
        })),
        total: filtered.length,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// Simple version comparison for Minecraft versions
function compareVersions(a: string, b: string): number {
  const partsA = a.split(".").map(Number);
  const partsB = b.split(".").map(Number);
  
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA !== numB) return numA - numB;
  }
  return 0;
}

