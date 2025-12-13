import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getProjectBySlug,
  getBuildsForVersion,
  getMinecraftVersionByString,
  getAllProjectSlugs,
  getProjectVersions,
} from "@/lib/jars";
import { BuildTable } from "../../components/BuildTable";
import { Breadcrumb } from "../../components/Breadcrumb";
import { siteConfig } from "../../siteConfig";
import { CategoryIcon } from "../../components/CategoryIcon";
import { formatDate, formatBytes } from "@/lib/utils";
import { RiDownloadLine, RiArrowLeftLine } from "@remixicon/react";
import Link from "next/link";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ project: string; version: string }>;
}

export async function generateStaticParams() {
  const slugs = await getAllProjectSlugs();
  const params: { project: string; version: string }[] = [];

  for (const slug of slugs) {
    const project = await getProjectBySlug(slug);
    if (!project) continue;

    const versions = await getProjectVersions(project.id);
    for (const version of versions) {
      params.push({ project: slug, version: version.version });
    }
  }

  return params;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { project: projectSlug, version: versionString } = await params;
  const project = await getProjectBySlug(projectSlug);

  if (!project) {
    return { title: "Not Found" };
  }

  return {
    title: `${project.name} ${versionString} Server Jar Download`,
    description: `Download ${project.name} server jar for Minecraft ${versionString}. Get the latest build or browse all available builds.`,
    alternates: {
      canonical: `${siteConfig.url}/${project.slug}/${versionString}`,
    },
    openGraph: {
      title: `${project.name} ${versionString} Download`,
      description: `Download ${project.name} for Minecraft ${versionString}.`,
      url: `${siteConfig.url}/${project.slug}/${versionString}`,
    },
  };
}

export default async function VersionPage({ params }: PageProps) {
  const { project: projectSlug, version: versionString } = await params;
  const project = await getProjectBySlug(projectSlug);

  if (!project) {
    notFound();
  }

  const [builds, mcVersion] = await Promise.all([
    getBuildsForVersion(project.id, versionString),
    getMinecraftVersionByString(versionString),
  ]);

  if (!mcVersion && builds.length === 0) {
    notFound();
  }

  const latestBuild =
    builds.find((b) => b.is_latest_for_mc_version) || builds[0];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `${project.name} ${versionString}`,
    applicationCategory: "GameApplication",
    operatingSystem: "Windows, macOS, Linux",
    softwareVersion: versionString,
    description: `${project.name} server for Minecraft ${versionString}`,
    url: `${siteConfig.url}/${project.slug}/${versionString}`,
    downloadUrl: latestBuild?.download_url,
    fileSize: latestBuild?.file_size
      ? `${Math.round(latestBuild.file_size / 1024 / 1024)} MB`
      : undefined,
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
          <Breadcrumb
            items={[
              { label: project.name, href: `/${project.slug}` },
              { label: versionString },
            ]}
          />

          {/* Header */}
          <header className="mb-8">
            <Link
              href={`/${project.slug}`}
              className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors mb-4"
            >
              <RiArrowLeftLine className="h-4 w-4" />
              All versions
            </Link>

            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-subtle)] text-[var(--text-muted)]">
                <CategoryIcon category={project.category} className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold">
                  {project.name}{" "}
                  <span className="font-mono text-primary">{versionString}</span>
                </h1>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {builds.length} build{builds.length !== 1 ? "s" : ""} available
                  {mcVersion?.release_date &&
                    ` · Released ${formatDate(mcVersion.release_date)}`}
                </p>
              </div>
            </div>

            {/* Quick Download */}
            {latestBuild && (
              <div className="mt-6 flex items-center justify-between gap-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                <div>
                  <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                    Latest Build
                  </p>
                  <p className="mt-0.5 font-mono text-sm">
                    #{latestBuild.build_number || "—"}
                    {latestBuild.file_size && (
                      <span className="ml-2 text-[var(--text-subtle)]">
                        ({formatBytes(latestBuild.file_size)})
                      </span>
                    )}
                  </p>
                </div>
                <Link
                  href={latestBuild.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
                >
                  <RiDownloadLine className="h-4 w-4" />
                  Download
                </Link>
              </div>
            )}
          </header>

          {/* Builds */}
          <section>
            <h2 className="text-lg font-semibold mb-4">All Builds</h2>
            <BuildTable projectSlug={project.slug} builds={builds} />
          </section>

          {/* SEO Content */}
          <section className="mt-12 pt-8 border-t border-[var(--border-subtle)] prose-custom">
            <h2>
              Download {project.name} for Minecraft {versionString}
            </h2>
            <p>
              This page lists all available {project.name} builds for Minecraft{" "}
              {versionString}. We recommend downloading the latest build for the
              best stability and performance.
            </p>
            <p>
              Each build includes a SHA256 checksum for verification. After
              downloading, you can verify the file integrity by comparing the
              checksum.
            </p>

            <h3>How to Install</h3>
            <ul>
              <li>Download the server jar file from the table above.</li>
              <li>Place the jar file in an empty folder for your server.</li>
              <li>
                Run the server with: <code>java -Xmx4G -jar server.jar nogui</code>
              </li>
              <li>Accept the EULA by editing <code>eula.txt</code>.</li>
              <li>Start the server again.</li>
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
