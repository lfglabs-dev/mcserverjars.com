import { redirect } from "next/navigation";
import {
  getProjectBySlug,
  getMinecraftVersionByString,
  getLatestBuildForVersion,
} from "@/lib/jars";

interface PageProps {
  params: Promise<{ project: string; version: string }>;
}

export default async function VersionLatestRedirectPage({ params }: PageProps) {
  const { project: projectSlug, version: versionString } = await params;
  const project = await getProjectBySlug(projectSlug);

  if (!project) {
    redirect("/");
  }

  const mcVersion = await getMinecraftVersionByString(versionString);

  if (!mcVersion) {
    redirect(`/${projectSlug}`);
  }

  const latestBuild = await getLatestBuildForVersion(project.id, mcVersion.id);

  if (latestBuild?.download_url) {
    redirect(latestBuild.download_url);
  }

  // Fallback to version page if no build available
  redirect(`/${projectSlug}/${versionString}`);
}

