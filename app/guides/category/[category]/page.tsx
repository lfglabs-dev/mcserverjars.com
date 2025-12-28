import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { siteConfig } from "@/app/siteConfig";
import { Breadcrumb } from "@/app/components/Breadcrumb";
import {
  getGuidesByCategory,
  formatReadingTime,
  CATEGORY_LABELS,
  CATEGORY_DESCRIPTIONS,
  CATEGORIES,
  type GuideCategory,
} from "@/lib/guides";
import { RiArticleLine, RiArrowRightLine, RiTimeLine } from "@remixicon/react";

export const revalidate = 3600;

interface Props {
  params: Promise<{ category: string }>;
}

export async function generateStaticParams() {
  return CATEGORIES.map((category) => ({
    category,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;

  if (!CATEGORIES.includes(category as GuideCategory)) {
    return {};
  }

  const categoryLabel = CATEGORY_LABELS[category as GuideCategory];
  const categoryDescription = CATEGORY_DESCRIPTIONS[category as GuideCategory];

  return {
    title: `${categoryLabel} | Minecraft Server Guides | MCServerJars`,
    description: categoryDescription,
    alternates: {
      canonical: `${siteConfig.url}/guides/category/${category}`,
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;

  if (!CATEGORIES.includes(category as GuideCategory)) {
    notFound();
  }

  const typedCategory = category as GuideCategory;
  const guides = await getGuidesByCategory(typedCategory);
  const categoryLabel = CATEGORY_LABELS[typedCategory];
  const categoryDescription = CATEGORY_DESCRIPTIONS[typedCategory];

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Breadcrumb
          items={[
            { label: "Guides", href: "/guides" },
            { label: categoryLabel },
          ]}
        />

        <header className="mb-8">
          <h1 className="text-3xl font-bold">{categoryLabel}</h1>
          <p className="mt-2 text-[var(--text-muted)]">{categoryDescription}</p>
        </header>

        {guides.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[var(--text-muted)]">
              No guides in this category yet.
            </p>
            <Link
              href="/guides"
              className="mt-4 inline-flex items-center text-primary hover:underline"
            >
              View all guides
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {guides.map((guide) => (
              <Link
                key={guide.slug}
                href={`/guides/${guide.slug}`}
                className="group flex items-start gap-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 transition-colors hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-subtle)] text-[var(--text-muted)] group-hover:text-primary">
                  <RiArticleLine className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold group-hover:text-primary transition-colors">
                    {guide.frontmatter.title}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)] line-clamp-2">
                    {guide.frontmatter.description}
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-[var(--text-subtle)]">
                    {guide.frontmatter.readingTime && (
                      <span className="flex items-center gap-1">
                        <RiTimeLine className="h-3.5 w-3.5" />
                        {formatReadingTime(guide.frontmatter.readingTime)}
                      </span>
                    )}
                    <div className="flex gap-2">
                      {guide.frontmatter.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-[var(--bg-subtle)] px-2 py-0.5"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <RiArrowRightLine className="h-5 w-5 shrink-0 text-[var(--text-subtle)] group-hover:text-primary transition-colors" />
              </Link>
            ))}
          </div>
        )}

        {/* Back to all guides */}
        <div className="mt-8 pt-8 border-t border-[var(--border-subtle)]">
          <Link
            href="/guides"
            className="text-sm text-[var(--text-muted)] hover:text-primary transition-colors"
          >
            &larr; Back to all guides
          </Link>
        </div>
      </div>
    </div>
  );
}
