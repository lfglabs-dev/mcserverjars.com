import { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "../siteConfig";
import {
  RiArticleLine,
  RiArrowRightLine,
  RiTimeLine,
  RiToolsLine,
  RiSettings3Line,
  RiComputerLine,
  RiErrorWarningLine,
  RiScalesLine,
} from "@remixicon/react";
import {
  getAllGuides,
  formatReadingTime,
  CATEGORY_LABELS,
  CATEGORIES,
  type GuideCategory,
  type Guide,
} from "@/lib/guides";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Minecraft Server Guides | MCServerJars",
  description:
    "Learn how to set up and optimize your Minecraft server. Guides for Paper, Spigot, Fabric, and more.",
  alternates: {
    canonical: `${siteConfig.url}/guides`,
  },
};

const categoryIcons: Record<GuideCategory, React.ElementType> = {
  setup: RiComputerLine,
  optimization: RiSettings3Line,
  comparisons: RiScalesLine,
  troubleshooting: RiErrorWarningLine,
  tools: RiToolsLine,
};

function GuideCard({ guide }: { guide: Guide }) {
  return (
    <Link
      href={`/guides/${guide.slug}`}
      className="group flex items-start gap-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 transition-colors hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)]"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-subtle)] text-[var(--text-muted)] group-hover:text-primary">
        <RiArticleLine className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold group-hover:text-primary transition-colors">
          {guide.frontmatter.title}
        </h3>
        <p className="mt-1 text-sm text-[var(--text-muted)] line-clamp-2">
          {guide.frontmatter.description}
        </p>
        <div className="mt-2 flex items-center gap-3 text-xs text-[var(--text-subtle)]">
          {guide.frontmatter.readingTime && (
            <span className="flex items-center gap-1">
              <RiTimeLine className="h-3.5 w-3.5" />
              {formatReadingTime(guide.frontmatter.readingTime)}
            </span>
          )}
        </div>
      </div>
      <RiArrowRightLine className="h-5 w-5 shrink-0 text-[var(--text-subtle)] group-hover:text-primary transition-colors" />
    </Link>
  );
}

export default async function GuidesPage() {
  const allGuides = await getAllGuides();

  // Group guides by category
  const guidesByCategory = CATEGORIES.reduce(
    (acc, category) => {
      acc[category] = allGuides.filter((g) => g.category === category);
      return acc;
    },
    {} as Record<GuideCategory, Guide[]>
  );

  // Get categories that have guides
  const categoriesWithGuides = CATEGORIES.filter(
    (cat) => guidesByCategory[cat].length > 0
  );

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Server Guides</h1>
          <p className="mt-2 text-[var(--text-muted)]">
            Learn how to set up, configure, and optimize your Minecraft server.
          </p>
        </header>

        {/* Category quick links */}
        {categoriesWithGuides.length > 1 && (
          <nav className="mb-8 flex flex-wrap gap-2">
            {categoriesWithGuides.map((category) => {
              const Icon = categoryIcons[category];
              return (
                <Link
                  key={category}
                  href={`/guides/category/${category}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1.5 text-sm text-[var(--text-muted)] hover:border-[var(--border-hover)] hover:text-[var(--foreground)] transition-colors"
                >
                  <Icon className="h-4 w-4" />
                  {CATEGORY_LABELS[category]}
                  <span className="ml-1 text-xs text-[var(--text-subtle)]">
                    ({guidesByCategory[category].length})
                  </span>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Guides by category */}
        {categoriesWithGuides.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[var(--text-muted)]">No guides available yet.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {categoriesWithGuides.map((category) => {
              const Icon = categoryIcons[category];
              const guides = guidesByCategory[category];

              return (
                <section key={category}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-[var(--text-muted)]" />
                      <h2 className="text-lg font-semibold">
                        {CATEGORY_LABELS[category]}
                      </h2>
                    </div>
                    <Link
                      href={`/guides/category/${category}`}
                      className="text-sm text-[var(--text-muted)] hover:text-primary transition-colors"
                    >
                      View all &rarr;
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {guides.slice(0, 3).map((guide) => (
                      <GuideCard key={guide.slug} guide={guide} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

