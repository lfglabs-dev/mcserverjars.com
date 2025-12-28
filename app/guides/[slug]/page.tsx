import { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { siteConfig } from "@/app/siteConfig";
import { Breadcrumb } from "@/app/components/Breadcrumb";
import {
  getAllGuides,
  getGuideBySlug,
  getRelatedGuides,
  getAuthorBySlug,
  formatReadingTime,
  CATEGORY_LABELS,
} from "@/lib/guides";
import { generateGuideSchema } from "@/lib/guides/schema";
import { CalloutBox, CodeBlock, DownloadButton, StartupFlagsGenerator } from "@/app/components/mdx";
import Link from "next/link";
import { RiTimeLine, RiUserLine, RiCalendarLine } from "@remixicon/react";

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const guides = await getAllGuides();
  return guides.map((guide) => ({
    slug: guide.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getGuideBySlug(slug);

  if (!guide) {
    return {};
  }

  const { frontmatter } = guide;
  const title = frontmatter.seoTitle || frontmatter.title;
  const description = frontmatter.seoDescription || frontmatter.description;

  return {
    title,
    description,
    alternates: {
      canonical: `${siteConfig.url}/guides/${slug}`,
    },
    openGraph: {
      title: frontmatter.title,
      description: frontmatter.description,
      url: `${siteConfig.url}/guides/${slug}`,
      type: "article",
      publishedTime: frontmatter.publishedAt,
      modifiedTime: frontmatter.updatedAt,
      authors: [frontmatter.author],
      tags: frontmatter.tags,
    },
  };
}

const mdxComponents = {
  CalloutBox,
  CodeBlock,
  DownloadButton,
  StartupFlagsGenerator,
  a: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    if (href?.startsWith("/")) {
      return (
        <Link href={href} {...props}>
          {children}
        </Link>
      );
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  },
};

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = await getGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

  const { frontmatter, content, category } = guide;
  const author = getAuthorBySlug(frontmatter.author);
  const relatedGuides = await getRelatedGuides(guide);
  const jsonLd = generateGuideSchema(guide);

  const publishDate = new Date(frontmatter.publishedAt).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

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
              { label: "Guides", href: "/guides" },
              {
                label: CATEGORY_LABELS[category],
                href: `/guides/category/${category}`,
              },
              { label: frontmatter.title },
            ]}
          />

          {/* Guide Header */}
          <header className="mb-8">
            <div className="flex flex-wrap gap-2 mb-4">
              <Link
                href={`/guides/category/${category}`}
                className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                {CATEGORY_LABELS[category]}
              </Link>
              {frontmatter.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-[var(--bg-subtle)] px-3 py-1 text-xs text-[var(--text-muted)]"
                >
                  {tag}
                </span>
              ))}
            </div>

            <h1 className="text-3xl font-bold mb-4">{frontmatter.title}</h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-muted)]">
              {author && (
                <div className="flex items-center gap-1.5">
                  <RiUserLine className="h-4 w-4" />
                  <span>{author.name}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <RiCalendarLine className="h-4 w-4" />
                <span>{publishDate}</span>
              </div>
              {frontmatter.readingTime && (
                <div className="flex items-center gap-1.5">
                  <RiTimeLine className="h-4 w-4" />
                  <span>{formatReadingTime(frontmatter.readingTime)}</span>
                </div>
              )}
            </div>
          </header>

          {/* Guide Content */}
          <article className="prose-custom">
            <MDXRemote
              source={content}
              components={mdxComponents}
              options={{
                mdxOptions: {
                  remarkPlugins: [remarkGfm],
                  rehypePlugins: [
                    rehypeSlug,
                    [rehypeAutolinkHeadings, { behavior: "wrap" }],
                  ],
                },
              }}
            />
          </article>

          {/* Related Guides */}
          {relatedGuides.length > 0 && (
            <section className="mt-12 pt-8 border-t border-[var(--border-subtle)]">
              <h2 className="text-lg font-semibold mb-4">Related Guides</h2>
              <div className="space-y-3">
                {relatedGuides.map((related) => (
                  <Link
                    key={related.slug}
                    href={`/guides/${related.slug}`}
                    className="block p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    <h3 className="font-medium hover:text-primary transition-colors">
                      {related.frontmatter.title}
                    </h3>
                    <p className="text-sm text-[var(--text-muted)] mt-1 line-clamp-2">
                      {related.frontmatter.description}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
