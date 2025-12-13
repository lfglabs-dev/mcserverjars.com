import { supabase } from "./supabase";
import type {
  JarProject,
  MinecraftVersion,
  JarBuildWithVersion,
} from "./database.types";
import { compareVersions } from "./utils";

// Helper type for Supabase query results
type BuildWithVersionResult = {
  id: string;
  project_id: string;
  minecraft_version_id: string;
  build_number: number | null;
  version_string: string | null;
  download_url: string;
  file_name: string | null;
  file_size: number | null;
  sha256: string | null;
  md5: string | null;
  is_latest_for_mc_version: boolean;
  is_latest_overall: boolean;
  is_recommended: boolean;
  stability: string;
  changelog: string | null;
  release_date: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  minecraft_versions: MinecraftVersion | null;
};

export async function getProjects(): Promise<JarProject[]> {
  const { data, error } = await supabase
    .from("jar_projects")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return (data || []) as JarProject[];
}

export async function getProjectBySlug(
  slug: string
): Promise<JarProject | null> {
  const { data, error } = await supabase
    .from("jar_projects")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error) return null;
  return data as JarProject;
}

export async function getProjectVersions(
  projectId: string
): Promise<MinecraftVersion[]> {
  const { data, error } = await supabase
    .from("jar_builds")
    .select("minecraft_versions(*)")
    .eq("project_id", projectId)
    .order("release_date", { ascending: false });

  if (error) throw error;

  const versionsMap = new Map<string, MinecraftVersion>();
  (data || []).forEach((build: { minecraft_versions: MinecraftVersion | null }) => {
    const version = build.minecraft_versions;
    if (version && !versionsMap.has(version.id)) {
      versionsMap.set(version.id, version);
    }
  });

  const versions = Array.from(versionsMap.values());
  versions.sort((a, b) => compareVersions(a.version, b.version));
  return versions;
}

export async function getBuildsForVersion(
  projectId: string,
  versionString: string
): Promise<JarBuildWithVersion[]> {
  const { data, error } = await supabase
    .from("jar_builds")
    .select("*, minecraft_versions(*)")
    .eq("project_id", projectId)
    .order("build_number", { ascending: false })
    .order("release_date", { ascending: false });

  if (error) throw error;

  const builds = (data || []) as BuildWithVersionResult[];
  const filtered = builds.filter((build) => {
    return build.minecraft_versions?.version === versionString;
  });

  return filtered as unknown as JarBuildWithVersion[];
}

export async function getBuild(
  projectSlug: string,
  versionString: string,
  buildNumber?: number
): Promise<JarBuildWithVersion | null> {
  const project = await getProjectBySlug(projectSlug);
  if (!project) return null;

  let query = supabase
    .from("jar_builds")
    .select("*, minecraft_versions(*)")
    .eq("project_id", project.id);

  if (buildNumber !== undefined) {
    query = query.eq("build_number", buildNumber);
  } else {
    query = query.eq("is_latest_for_mc_version", true);
  }

  const { data, error } = await query.limit(1);

  if (error || !data || data.length === 0) return null;

  const builds = data as BuildWithVersionResult[];
  const build = builds.find((b) => {
    return b.minecraft_versions?.version === versionString;
  });

  return (build as unknown as JarBuildWithVersion) || null;
}

export async function getLatestBuild(
  projectId: string
): Promise<JarBuildWithVersion | null> {
  const { data, error } = await supabase
    .from("jar_builds")
    .select("*, minecraft_versions(*)")
    .eq("project_id", projectId)
    .eq("is_latest_overall", true)
    .single();

  if (error) return null;
  return data as unknown as JarBuildWithVersion;
}

export async function getLatestBuildForVersion(
  projectId: string,
  versionId: string
): Promise<JarBuildWithVersion | null> {
  const { data, error } = await supabase
    .from("jar_builds")
    .select("*, minecraft_versions(*)")
    .eq("project_id", projectId)
    .eq("minecraft_version_id", versionId)
    .eq("is_latest_for_mc_version", true)
    .single();

  if (error) return null;
  return data as unknown as JarBuildWithVersion;
}

export async function getMinecraftVersionByString(
  version: string
): Promise<MinecraftVersion | null> {
  const { data, error } = await supabase
    .from("minecraft_versions")
    .select("*")
    .eq("version", version)
    .single();

  if (error) return null;
  return data as MinecraftVersion;
}

export async function getAllProjectSlugs(): Promise<string[]> {
  const { data, error } = await supabase
    .from("jar_projects")
    .select("slug")
    .eq("is_active", true);

  if (error) return [];
  return (data || []).map((p: { slug: string }) => p.slug);
}

export async function getProjectStats(projectId: string): Promise<{
  versionCount: number;
  buildCount: number;
  latestVersion: string | null;
}> {
  const { data: builds, error } = await supabase
    .from("jar_builds")
    .select("minecraft_versions(version)")
    .eq("project_id", projectId);

  if (error || !builds) {
    return { versionCount: 0, buildCount: 0, latestVersion: null };
  }

  const versions = new Set<string>();
  (builds as { minecraft_versions: { version: string } | null }[]).forEach((b) => {
    if (b.minecraft_versions?.version) {
      versions.add(b.minecraft_versions.version);
    }
  });

  const sortedVersions = Array.from(versions).sort(compareVersions);

  return {
    versionCount: versions.size,
    buildCount: builds.length,
    latestVersion: sortedVersions[0] || null,
  };
}
