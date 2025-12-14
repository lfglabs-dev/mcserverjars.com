import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function getOrCreateMinecraftVersion(
  version: string,
  releaseDate?: string,
  versionType: string = "release"
) {
  // Try to find existing
  const { data: existing } = await supabase
    .from("minecraft_versions")
    .select("id")
    .eq("version", version)
    .single();

  if (existing) {
    return existing.id;
  }

  // Create new
  const { data: created, error } = await supabase
    .from("minecraft_versions")
    .insert({
      version,
      version_type: versionType,
      release_date: releaseDate || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error(`Failed to create MC version ${version}:`, error);
    throw error;
  }

  return created.id;
}

export async function getProjectBySlug(slug: string) {
  const { data, error } = await supabase
    .from("jar_projects")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) throw error;
  return data;
}

export async function getProjectBySlugOptional(slug: string) {
  const { data, error } = await supabase
    .from("jar_projects")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export type JarProjectCategory = "server" | "proxy" | "modloader" | "hybrid";

export type JarProjectUpsert = {
  slug: string;
  name: string;
  description?: string | null;
  website_url?: string | null;
  source_url?: string | null;
  api_url?: string | null;
  logo_url?: string | null;
  category: JarProjectCategory;
  requires_build: boolean;
  is_active: boolean;
  display_order: number;
};

export async function upsertProject(project: JarProjectUpsert) {
  const existing = await getProjectBySlugOptional(project.slug);

  if (existing) {
    const { data, error } = await supabase
      .from("jar_projects")
      .update(project)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("jar_projects")
    .insert(project)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function upsertBuild(build: {
  project_id: string;
  minecraft_version_id: string;
  build_number?: number;
  version_string?: string;
  download_url: string;
  file_name?: string;
  file_size?: number;
  sha256?: string;
  md5?: string;
  stability?: string;
  changelog?: string;
  release_date?: string;
  metadata?: Record<string, unknown>;
  is_latest_for_mc_version?: boolean;
  is_latest_overall?: boolean;
}) {
  const { error } = await supabase.from("jar_builds").upsert(build, {
    onConflict: "project_id,minecraft_version_id,build_number",
  });

  if (error) {
    console.error("Failed to upsert build:", error);
    throw error;
  }
}

export async function createSyncLog(projectId: string) {
  const { data, error } = await supabase
    .from("jar_sync_logs")
    .insert({ project_id: projectId, status: "running" })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateSyncLog(
  logId: string,
  status: "success" | "failed",
  stats: {
    builds_added?: number;
    builds_updated?: number;
    error_message?: string;
  }
) {
  await supabase
    .from("jar_sync_logs")
    .update({
      status,
      completed_at: new Date().toISOString(),
      ...stats,
    })
    .eq("id", logId);
}

export async function clearLatestFlags(projectId: string) {
  // Clear all latest flags for this project
  await supabase
    .from("jar_builds")
    .update({
      is_latest_for_mc_version: false,
      is_latest_overall: false,
    })
    .eq("project_id", projectId);
}

export async function markLatestBuilds(projectId: string) {
  // Get all builds grouped by MC version, find latest for each
  const { data: builds } = await supabase
    .from("jar_builds")
    .select("id, minecraft_version_id, build_number, release_date")
    .eq("project_id", projectId)
    .order("build_number", { ascending: false })
    .order("release_date", { ascending: false });

  if (!builds || builds.length === 0) return;

  const latestByVersion = new Map<string, string>();
  let overallLatest: {
    id: string;
    buildNumber: number;
    releaseDate: string | null;
  } | null = null;

  for (const build of builds) {
    // Track latest for each MC version
    if (!latestByVersion.has(build.minecraft_version_id)) {
      latestByVersion.set(build.minecraft_version_id, build.id);
    }

    // Track overall latest
    if (
      !overallLatest ||
      (build.build_number && build.build_number > overallLatest.buildNumber)
    ) {
      overallLatest = {
        id: build.id,
        buildNumber: build.build_number || 0,
        releaseDate: build.release_date,
      };
    }
  }

  // Update latest for each MC version
  for (const buildId of latestByVersion.values()) {
    await supabase
      .from("jar_builds")
      .update({ is_latest_for_mc_version: true })
      .eq("id", buildId);
  }

  // Update overall latest
  if (overallLatest) {
    await supabase
      .from("jar_builds")
      .update({ is_latest_overall: true })
      .eq("id", overallLatest.id);
  }
}
