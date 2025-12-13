import { redirect } from "next/navigation";
import { getProjectBySlug, getLatestBuild } from "@/lib/jars";

interface PageProps {
  params: Promise<{ project: string }>;
}

export default async function LatestRedirectPage({ params }: PageProps) {
  const { project: projectSlug } = await params;
  const project = await getProjectBySlug(projectSlug);

  if (!project) {
    redirect("/");
  }

  const latestBuild = await getLatestBuild(project.id);

  if (latestBuild?.download_url) {
    redirect(latestBuild.download_url);
  }

  // Fallback to project page if no build available
  redirect(`/${projectSlug}`);
}

