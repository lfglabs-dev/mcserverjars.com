import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

interface IdRow {
  id: string;
}

interface BuildRow {
  build_number: number | null;
  download_url: string;
  file_name: string | null;
  file_size: number | null;
  sha256: string | null;
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

    // Get the latest build for this project and version
    const { data: buildData, error: buildError } = await supabase
      .from("jar_builds")
      .select("build_number, download_url, file_name, file_size, sha256, release_date")
      .eq("project_id", project.id)
      .eq("minecraft_version_id", mcVersion.id)
      .eq("is_latest_for_mc_version", true)
      .single();

    if (buildError || !buildData) {
      // Fallback: get the build with highest build number
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("jar_builds")
        .select("build_number, download_url, file_name, file_size, sha256, release_date")
        .eq("project_id", project.id)
        .eq("minecraft_version_id", mcVersion.id)
        .order("build_number", { ascending: false, nullsFirst: false })
        .limit(1)
        .single();

      if (fallbackError || !fallbackData) {
        return NextResponse.json({ error: "No builds found" }, { status: 404 });
      }

      const fallbackBuild = fallbackData as BuildRow;

      return NextResponse.json({
        build: fallbackBuild.build_number,
        download_url: fallbackBuild.download_url,
        sha256: fallbackBuild.sha256,
        created_at: fallbackBuild.release_date,
        file_name: fallbackBuild.file_name,
        file_size: fallbackBuild.file_size,
      });
    }

    const build = buildData as BuildRow;

    return NextResponse.json({
      build: build.build_number,
      download_url: build.download_url,
      sha256: build.sha256,
      created_at: build.release_date,
      file_name: build.file_name,
      file_size: build.file_size,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
