import { Metadata } from "next";
import { getProjects, getProjectStats } from "@/lib/jars";
import { ProjectCard } from "./components/ProjectCard";
import { siteConfig } from "./siteConfig";
import { getCategoryLabel } from "@/lib/utils";
import { CategoryIcon } from "./components/CategoryIcon";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Download Minecraft Server Jars | MCServerJars",
  description:
    "Download the latest Minecraft server jars for Paper, Spigot, Vanilla, Fabric, Forge, Purpur, and more. Always up-to-date with every Minecraft version.",
  alternates: {
    canonical: siteConfig.url,
  },
};

export default async function HomePage() {
  const projects = await getProjects();

  const projectsByCategory = projects.reduce(
    (acc, project) => {
      const category = project.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(project);
      return acc;
    },
    {} as Record<string, typeof projects>
  );

  const projectsWithStats = await Promise.all(
    projects.map(async (project) => ({
      project,
      stats: await getProjectStats(project.id),
    }))
  );

  const statsMap = new Map(
    projectsWithStats.map(({ project, stats }) => [project.id, stats])
  );

  const totalBuilds = projectsWithStats.reduce(
    (sum, p) => sum + p.stats.buildCount,
    0
  );

  const categoryOrder = ["server", "proxy", "modloader", "hybrid"];

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "MCServerJars",
    url: siteConfig.url,
    logo: `${siteConfig.url}/og-image.jpg`,
    description: siteConfig.metaDescription,
    sameAs: ["https://github.com/lfglabs-dev/mcserverjars.com"],
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "MCServerJars",
    url: siteConfig.url,
    description: siteConfig.metaDescription,
    publisher: {
      "@type": "Organization",
      name: "MCServerJars",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([organizationSchema, websiteSchema]),
        }}
      />
      <div className="hero-gradient min-h-screen">
        {/* Hero */}
      <section className="pt-28 pb-12 px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Minecraft Server Jars
          </h1>
          <p className="mt-4 text-base text-[var(--text-muted)] max-w-xl mx-auto">
            Download Paper, Spigot, Vanilla, Fabric, and more. Always up-to-date.
          </p>
          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-[var(--text-muted)]">
            <span>
              <strong className="text-[var(--foreground)]">{projects.length}</strong> projects
            </span>
            <span className="text-[var(--border-strong)]">·</span>
            <span>
              <strong className="text-[var(--foreground)]">{totalBuilds}</strong> builds
            </span>
          </div>
        </div>
      </section>

      {/* Projects */}
      <section className="pb-16 px-4 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-10">
          {categoryOrder.map((category) => {
            const categoryProjects = projectsByCategory[category];
            if (!categoryProjects || categoryProjects.length === 0) return null;

            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <CategoryIcon
                    category={category}
                    className="h-4 w-4 text-[var(--text-subtle)]"
                  />
                  <h2 className="text-sm font-medium text-[var(--text-muted)]">
                    {getCategoryLabel(category)}
                  </h2>
                </div>
                <div className="space-y-2">
                  {categoryProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      stats={statsMap.get(project.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SEO Content */}
      <section className="border-t border-[var(--border-subtle)] py-12 px-4 sm:px-6">
        <div className="mx-auto max-w-3xl prose-custom">
          <h2>About MCServerJars</h2>
          <p>
            MCServerJars is the comprehensive registry for downloading Minecraft
            server jars. Whether you&apos;re looking for the latest Paper
            server, a specific Spigot build, the official Vanilla server, or
            mod loaders like Fabric and Forge, we have you covered.
          </p>

          <h3>Why Use MCServerJars?</h3>
          <ul>
            <li>
              <strong>Always Up-to-Date</strong> — Our automated systems
              continuously check for new releases and builds.
            </li>
            <li>
              <strong>Verified Downloads</strong> — All jars include SHA256
              checksums for verification.
            </li>
            <li>
              <strong>Direct Links</strong> — Downloads link directly to official
              sources when possible.
            </li>
            <li>
              <strong>Every Version</strong> — From the latest 1.21.4 to legacy
              versions like 1.8.8.
            </li>
          </ul>

          <h3>Popular Server Software</h3>
          <p>
            <strong>Paper</strong> is the most popular choice for Minecraft
            servers, offering significant performance improvements over Vanilla
            while maintaining full compatibility with Bukkit and Spigot plugins.
          </p>
          <p>
            <strong>Spigot</strong> is the original high-performance fork of
            CraftBukkit, still widely used and the foundation for Paper.
          </p>
          <p>
            <strong>Vanilla</strong> is the official Minecraft server from
            Mojang, perfect for those who want the pure, unmodified experience.
          </p>
        </div>
      </section>
      </div>
    </>
  );
}
