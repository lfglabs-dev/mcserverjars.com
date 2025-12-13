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

/**
 * Get changelogs for a version range
 * GET /api/v1/changelogs/range?from=1.21.9&to=1.21.11&project=paper
 * 
 * Returns changelogs from version (excluded) to version (included)
 * Useful for LLMs to understand what changed between versions
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    
    const from = searchParams.get("from"); // version to start from (excluded)
    const to = searchParams.get("to"); // version to end at (included)
    const project = searchParams.get("project"); // optional filter

    if (!from || !to) {
      return NextResponse.json(
        { error: "Both 'from' and 'to' query parameters are required" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("changelogs")
      .select("*")
      .order("version", { ascending: true });

    if (project) {
      query = query.eq("project", project);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const changelogs = (data || []) as ChangelogRow[];

    // Filter to range: from (excluded) < version <= to (included)
    const filtered = changelogs.filter((c) => {
      const cmpFrom = compareVersions(c.version, from);
      const cmpTo = compareVersions(c.version, to);
      return cmpFrom > 0 && cmpTo <= 0;
    });

    // Group by project for easy consumption
    const byProject: Record<string, typeof filtered> = {};
    for (const c of filtered) {
      if (!byProject[c.project]) {
        byProject[c.project] = [];
      }
      byProject[c.project].push(c);
    }

    // Create aggregated changelog for LLM consumption
    const aggregated = {
      from_version: from,
      to_version: to,
      versions_included: [...new Set(filtered.map((c) => c.version))].sort(compareVersions),
      by_project: Object.fromEntries(
        Object.entries(byProject).map(([proj, logs]) => [
          proj,
          {
            breaking_changes: logs.flatMap((c) => 
              c.breaking_changes.map((bc) => `[${c.version}] ${bc}`)
            ),
            new_features: logs.flatMap((c) => 
              c.new_features.map((nf) => `[${c.version}] ${nf}`)
            ),
            api_changes: logs.flatMap((c) => 
              c.api_changes.map((ac) => `[${c.version}] ${ac}`)
            ),
            resource_format_changes: logs.flatMap((c) => 
              c.resource_format_changes.map((rf) => `[${c.version}] ${rf}`)
            ),
            developer_notes: logs.flatMap((c) => 
              c.developer_notes.map((dn) => `[${c.version}] ${dn}`)
            ),
          },
        ])
      ),
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
      })),
    };

    return NextResponse.json(aggregated, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
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

