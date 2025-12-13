import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getProjectBySlug,
  getProjectVersions,
  getProjectStats,
  getAllProjectSlugs,
} from "@/lib/jars";
import { VersionTable } from "../components/VersionTable";
import { Breadcrumb } from "../components/Breadcrumb";
import { siteConfig } from "../siteConfig";
import { getCategoryLabel } from "@/lib/utils";
import { CategoryIcon } from "../components/CategoryIcon";
import {
  RiExternalLinkLine,
  RiGithubLine,
  RiDownloadLine,
} from "@remixicon/react";
import Link from "next/link";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ project: string }>;
}

export async function generateStaticParams() {
  try {
    const slugs = await getAllProjectSlugs();
    return slugs.map((project) => ({ project }));
  } catch {
    // Return empty if Supabase isn't available during build
    return [];
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { project: projectSlug } = await params;
  const project = await getProjectBySlug(projectSlug);

  if (!project) {
    return { title: "Project Not Found" };
  }

  const stats = await getProjectStats(project.id);
  const latestVersion = stats.latestVersion || "latest";

  return {
    title: `${project.name} Server Jar Download | All Versions`,
    description: `Download ${project.name} server jar for Minecraft ${latestVersion} and all other versions. ${project.description}`,
    alternates: {
      canonical: `${siteConfig.url}/${project.slug}`,
    },
    openGraph: {
      title: `${project.name} Server Jar Download`,
      description: `Download ${project.name} for Minecraft. ${stats.versionCount} versions available.`,
      url: `${siteConfig.url}/${project.slug}`,
    },
  };
}

export default async function ProjectPage({ params }: PageProps) {
  const { project: projectSlug } = await params;
  const project = await getProjectBySlug(projectSlug);

  if (!project) {
    notFound();
  }

  const [versions, stats] = await Promise.all([
    getProjectVersions(project.id),
    getProjectStats(project.id),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: project.name,
    applicationCategory: "GameApplication",
    operatingSystem: "Windows, macOS, Linux",
    description: project.description,
    url: `${siteConfig.url}/${project.slug}`,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="pt-24 pb-16 px-4 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <Breadcrumb items={[{ label: project.name }]} />

          {/* Header */}
          <header className="mb-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-subtle)] text-[var(--text-muted)]">
                <CategoryIcon category={project.category} className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold">
                    {project.name}
                  </h1>
                  <span className="rounded-full bg-[var(--bg-subtle)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-muted)]">
                    {getCategoryLabel(project.category)}
                  </span>
                </div>
                <p className="mt-2 text-[var(--text-muted)]">
                  {project.description}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                  {project.website_url && (
                    <a
                      href={project.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
                    >
                      <RiExternalLinkLine className="h-4 w-4" />
                      Website
                    </a>
                  )}
                  {project.source_url && (
                    <a
                      href={project.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
                    >
                      <RiGithubLine className="h-4 w-4" />
                      Source
                    </a>
                  )}
                  <span className="text-[var(--text-subtle)]">
                    {stats.versionCount} versions · {stats.buildCount} builds
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Download */}
            {stats.latestVersion && (
              <div className="mt-6 flex items-center justify-between gap-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                <div>
                  <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                    Latest
                  </p>
                  <p className="mt-0.5 text-lg font-mono font-semibold">
                    {stats.latestVersion}
                  </p>
                </div>
                <Link
                  href={`/${project.slug}/${stats.latestVersion}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
                >
                  <RiDownloadLine className="h-4 w-4" />
                  Download
                </Link>
              </div>
            )}
          </header>

          {/* Versions */}
          <section>
            <h2 className="text-lg font-semibold mb-4">All Versions</h2>
            <VersionTable
              projectSlug={project.slug}
              versions={versions}
              latestVersion={stats.latestVersion || undefined}
            />
          </section>

          {/* SEO Content */}
          <section className="mt-12 pt-8 border-t border-[var(--border-subtle)] prose-custom">
            <h2>About {project.name}</h2>
            <p>
              {project.name} is a {getCategoryLabel(project.category).toLowerCase().slice(0, -1)} for Minecraft
              servers.{" "}
              {project.description ||
                `Download ${project.name} jars for any Minecraft version.`}
            </p>
            <p>
              We track {stats.buildCount} builds across {stats.versionCount}{" "}
              Minecraft versions, from the latest {stats.latestVersion || "release"} to older
              legacy versions.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
