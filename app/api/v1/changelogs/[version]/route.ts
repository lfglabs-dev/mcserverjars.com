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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ version: string }> }
) {
  try {
    const { version } = await params;
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    
    const project = searchParams.get("project"); // optional filter

    let query = supabase
      .from("changelogs")
      .select("*")
      .eq("version", version);

    if (project) {
      query = query.eq("project", project);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const changelogs = (data || []) as ChangelogRow[];

    if (changelogs.length === 0) {
      return NextResponse.json(
        { error: `No changelog found for version ${version}` },
        { status: 404 }
      );
    }

    // If single project requested, return single object
    if (project && changelogs.length === 1) {
      const c = changelogs[0];
      return NextResponse.json(
        {
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
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          },
        }
      );
    }

    // Return all project changelogs for this version
    return NextResponse.json(
      {
        version,
        changelogs: changelogs.map((c) => ({
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

