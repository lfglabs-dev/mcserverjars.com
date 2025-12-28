import { MetadataRoute } from "next";
import { siteConfig } from "./siteConfig";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url;
  const now = new Date();

  // Static pages that always exist
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/guides`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/guides/paper-vs-spigot`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/guides/how-to-install-paper`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/guides/best-minecraft-server-software-2025`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/docs`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/developers/nms`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/developers/changelogs`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
  ];

  // Try to fetch dynamic pages from Supabase
  try {
    const { getProjects, getProjectVersions } = await import("@/lib/jars");

    const projects = await getProjects();
    
    const projectPages: MetadataRoute.Sitemap = projects.map((project) => ({
      url: `${baseUrl}/${project.slug}`,
      lastModified: new Date(project.updated_at),
      changeFrequency: "daily" as const,
      priority: 0.9,
    }));

    const versionPages: MetadataRoute.Sitemap = [];
    for (const project of projects) {
      const versions = await getProjectVersions(project.id);
      for (const version of versions) {
        versionPages.push({
          url: `${baseUrl}/${project.slug}/${version.version}`,
          lastModified: new Date(version.created_at),
          changeFrequency: "weekly" as const,
          priority: 0.8,
        });
      }
    }

    return [...staticPages, ...projectPages, ...versionPages];
  } catch (error) {
    // If Supabase isn't available, return only static pages
    console.warn("Sitemap: Could not fetch dynamic pages:", error);
    return staticPages;
  }
}
