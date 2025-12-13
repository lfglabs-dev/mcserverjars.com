import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

interface ProjectId {
  id: string;
}

interface BuildWithVersion {
  minecraft_versions: {
    version: string;
    version_type: string;
    release_date: string | null;
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = getSupabase();

    // Get project
    const { data: projectData, error: projectError } = await supabase
      .from("jar_projects")
      .select("id")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (projectError || !projectData) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const project = projectData as ProjectId;

    // Get unique versions for this project
    const { data: buildsData, error: buildsError } = await supabase
      .from("jar_builds")
      .select("minecraft_versions(version, version_type, release_date)")
      .eq("project_id", project.id);

    if (buildsError) {
      return NextResponse.json({ error: buildsError.message }, { status: 500 });
    }

    const builds = (buildsData || []) as unknown as BuildWithVersion[];

    // Deduplicate and extract versions
    const versionMap = new Map<string, { version: string; version_type: string; release_date: string | null }>();
    for (const build of builds) {
      const mv = build.minecraft_versions;
      if (mv && !versionMap.has(mv.version)) {
        versionMap.set(mv.version, mv);
      }
    }

    // Sort by version (semantic-ish)
    const versions = Array.from(versionMap.values()).sort((a, b) => {
      return b.version.localeCompare(a.version, undefined, { numeric: true, sensitivity: "base" });
    });

    return NextResponse.json(versions);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
