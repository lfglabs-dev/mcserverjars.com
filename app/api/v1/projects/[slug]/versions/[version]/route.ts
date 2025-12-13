import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

interface IdRow {
  id: string;
}

interface BuildRow {
  build_number: number | null;
  version_string: string | null;
  download_url: string;
  file_name: string | null;
  file_size: number | null;
  sha256: string | null;
  stability: string | null;
  is_latest_for_mc_version: boolean;
  release_date: string | null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; version: string }> }
) {
  try {
    const { slug, version } = await params;
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

    const project = projectData as IdRow;

    // Get minecraft version
    const { data: mcVersionData, error: mcError } = await supabase
      .from("minecraft_versions")
      .select("id")
      .eq("version", version)
      .single();

    if (mcError || !mcVersionData) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    const mcVersion = mcVersionData as IdRow;

    // Get all builds for this project and version
    const { data: buildsData, error: buildsError } = await supabase
      .from("jar_builds")
      .select("build_number, version_string, download_url, file_name, file_size, sha256, stability, is_latest_for_mc_version, release_date")
      .eq("project_id", project.id)
      .eq("minecraft_version_id", mcVersion.id)
      .order("build_number", { ascending: false, nullsFirst: false });

    if (buildsError) {
      return NextResponse.json({ error: buildsError.message }, { status: 500 });
    }

    const builds = (buildsData || []) as BuildRow[];

    const response = builds.map((b) => ({
      build: b.build_number,
      download_url: b.download_url,
      sha256: b.sha256,
      created_at: b.release_date,
      file_name: b.file_name,
      file_size: b.file_size,
      is_latest: b.is_latest_for_mc_version,
    }));

    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
