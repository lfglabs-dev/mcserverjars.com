export interface Database {
  public: {
    Tables: {
      jar_projects: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          website_url: string | null;
          source_url: string | null;
          api_url: string | null;
          logo_url: string | null;
          category: "server" | "proxy" | "modloader" | "hybrid";
          requires_build: boolean;
          is_active: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["jar_projects"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["jar_projects"]["Insert"]>;
      };
      minecraft_versions: {
        Row: {
          id: string;
          version: string;
          version_type: "release" | "snapshot" | "beta" | "alpha";
          release_date: string | null;
          is_latest: boolean;
          protocol_version: number | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["minecraft_versions"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<
          Database["public"]["Tables"]["minecraft_versions"]["Insert"]
        >;
      };
      jar_builds: {
        Row: {
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
          stability: "stable" | "experimental" | "snapshot";
          changelog: string | null;
          release_date: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["jar_builds"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["jar_builds"]["Insert"]>;
      };
      jar_sync_logs: {
        Row: {
          id: string;
          project_id: string | null;
          started_at: string;
          completed_at: string | null;
          status: "running" | "success" | "failed";
          builds_added: number;
          builds_updated: number;
          error_message: string | null;
          metadata: Record<string, unknown>;
        };
        Insert: Omit<
          Database["public"]["Tables"]["jar_sync_logs"]["Row"],
          "id" | "started_at"
        >;
        Update: Partial<
          Database["public"]["Tables"]["jar_sync_logs"]["Insert"]
        >;
      };
    };
  };
}

export type JarProject = Database["public"]["Tables"]["jar_projects"]["Row"];
export type MinecraftVersion =
  Database["public"]["Tables"]["minecraft_versions"]["Row"];
export type JarBuild = Database["public"]["Tables"]["jar_builds"]["Row"];
export type JarSyncLog = Database["public"]["Tables"]["jar_sync_logs"]["Row"];

// Joined types for queries
export interface JarBuildWithVersion extends JarBuild {
  minecraft_versions: MinecraftVersion;
}

export interface JarProjectWithBuilds extends JarProject {
  jar_builds: JarBuildWithVersion[];
  latest_build?: JarBuildWithVersion;
  version_count?: number;
}

