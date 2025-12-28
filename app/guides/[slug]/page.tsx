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
import {
  CalloutBox,
  CodeBlock,
  DownloadButton,
  StartupFlagsGenerator,
  ServerPropertiesGenerator,
  RamCalculator,
} from "@/app/components/mdx";
import Link from "next/link";
import { RiUserLine, RiArrowRightLine } from "@remixicon/react";

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
  ServerPropertiesGenerator,
  RamCalculator,
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
          <header className="mb-10">
            <div className="flex items-center gap-3 text-sm text-[var(--text-muted)] mb-4">
              <Link
                href={`/guides/category/${category}`}
                className="font-medium text-primary hover:underline"
              >
                {CATEGORY_LABELS[category]}
              </Link>
              <span className="text-[var(--text-subtle)]">·</span>
              <span>{publishDate}</span>
              {frontmatter.readingTime && (
                <>
                  <span className="text-[var(--text-subtle)]">·</span>
                  <span>{formatReadingTime(frontmatter.readingTime)}</span>
                </>
              )}
            </div>

            <h1 className="text-4xl font-bold tracking-tight mb-4">{frontmatter.title}</h1>

            <p className="text-lg text-[var(--text-muted)] leading-relaxed">
              {frontmatter.description}
            </p>

            {author && (
              <div className="flex items-center gap-3 mt-6 pt-6 border-t border-[var(--border-subtle)]">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <RiUserLine className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium">{author.name}</div>
                  {author.role && (
                    <div className="text-sm text-[var(--text-muted)]">{author.role}</div>
                  )}
                </div>
              </div>
            )}
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
            <section className="mt-16 pt-8 border-t border-[var(--border-subtle)]">
              <h2 className="text-xl font-semibold mb-6">Continue Reading</h2>
              <div className="grid gap-4">
                {relatedGuides.map((related) => (
                  <Link
                    key={related.slug}
                    href={`/guides/${related.slug}`}
                    className="group flex items-center justify-between p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-primary/30 hover:bg-[var(--bg-hover)] transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold group-hover:text-primary transition-colors">
                        {related.frontmatter.title}
                      </h3>
                      <p className="text-sm text-[var(--text-muted)] mt-1 line-clamp-1">
                        {related.frontmatter.description}
                      </p>
                    </div>
                    <RiArrowRightLine className="h-5 w-5 ml-4 text-[var(--text-subtle)] group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
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
