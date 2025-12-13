import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import type { JarProject, JarBuild } from "@/lib/database.types";

type ProjectWithId = Pick<JarProject, "id" | "slug" | "name" | "description" | "website_url" | "category">;
type BuildVersionId = Pick<JarBuild, "minecraft_version_id">;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const supabase = getSupabase();
    
    const { data: projectData, error: projectError } = await supabase
      .from("jar_projects")
      .select("id, slug, name, description, website_url, category")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (projectError || !projectData) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const project = projectData as ProjectWithId;

    // Get version and build counts
    const { count: buildCount } = await supabase
      .from("jar_builds")
      .select("*", { count: "exact", head: true })
      .eq("project_id", project.id);

    const { data: versionData } = await supabase
      .from("jar_builds")
      .select("minecraft_version_id")
      .eq("project_id", project.id);

    const versions = (versionData || []) as BuildVersionId[];
    const uniqueVersions = new Set(versions.map((b) => b.minecraft_version_id));

    return NextResponse.json({
      id: project.id,
      slug: project.slug,
      name: project.name,
      description: project.description,
      website_url: project.website_url,
      category: project.category,
      version_count: uniqueVersions.size,
      build_count: buildCount || 0,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

