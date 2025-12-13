import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

interface NmsMapping {
  minecraft_version: string;
  nms_revision: string;
  craftbukkit_package: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ version: string }> }
) {
  try {
    const { version } = await params;
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("nms_version_mappings")
      .select("minecraft_version, nms_revision, craftbukkit_package")
      .eq("minecraft_version", version)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: `No NMS mapping found for version ${version}` },
        { status: 404 }
      );
    }

    const mapping = data as unknown as NmsMapping;

    return NextResponse.json(
      {
        minecraft_version: mapping.minecraft_version,
        nms_revision: mapping.nms_revision,
        craftbukkit_package: mapping.craftbukkit_package,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
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

