import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

interface NmsMapping {
  minecraft_version: string;
  nms_revision: string;
  craftbukkit_package: string;
}

export async function GET() {
  try {
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from("nms_version_mappings")
      .select("minecraft_version, nms_revision, craftbukkit_package")
      .order("minecraft_version", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const mappings = (data || []) as unknown as NmsMapping[];

    // Build grouped views for convenience
    const byRevision: Record<string, string[]> = {};
    const byVersion: Record<string, string> = {};

    for (const mapping of mappings) {
      byVersion[mapping.minecraft_version] = mapping.nms_revision;
      if (!byRevision[mapping.nms_revision]) {
        byRevision[mapping.nms_revision] = [];
      }
      byRevision[mapping.nms_revision].push(mapping.minecraft_version);
    }

    return NextResponse.json({
      mappings: mappings.map((m) => ({
        minecraft_version: m.minecraft_version,
        nms_revision: m.nms_revision,
        craftbukkit_package: m.craftbukkit_package,
      })),
      by_revision: byRevision,
      by_version: byVersion,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

