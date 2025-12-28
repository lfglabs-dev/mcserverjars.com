import { siteConfig } from "@/app/siteConfig";
import type { Guide } from "./types";
import { getAuthorBySlug } from "./index";

interface ArticleSchema {
  "@context": "https://schema.org";
  "@type": "Article";
  headline: string;
  description: string;
  datePublished: string;
  dateModified: string;
  author: {
    "@type": "Person" | "Organization";
    name: string;
    url?: string;
  };
  publisher: {
    "@type": "Organization";
    name: string;
    url: string;
    logo?: {
      "@type": "ImageObject";
      url: string;
    };
  };
  mainEntityOfPage?: {
    "@type": "WebPage";
    "@id": string;
  };
  image?: string;
}

interface HowToSchema {
  "@context": "https://schema.org";
  "@type": "HowTo";
  name: string;
  description: string;
  step: Array<{
    "@type": "HowToStep";
    name: string;
    text: string;
  }>;
  datePublished?: string;
  dateModified?: string;
}

interface FAQSchema {
  "@context": "https://schema.org";
  "@type": "FAQPage";
  mainEntity: Array<{
    "@type": "Question";
    name: string;
    acceptedAnswer: {
      "@type": "Answer";
      text: string;
    };
  }>;
}

export type SchemaOutput = ArticleSchema | HowToSchema | FAQSchema;

export function generateGuideSchema(guide: Guide): SchemaOutput {
  const { frontmatter } = guide;
  const author = getAuthorBySlug(frontmatter.author);
  const guideUrl = `${siteConfig.url}/guides/${guide.slug}`;

  const dateModified =
    frontmatter.updatedAt || frontmatter.publishedAt;

  switch (frontmatter.schemaType) {
    case "HowTo":
      return {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: frontmatter.title,
        description: frontmatter.description,
        datePublished: frontmatter.publishedAt,
        dateModified,
        step:
          frontmatter.howToSteps?.map((step) => ({
            "@type": "HowToStep" as const,
            name: step.name,
            text: step.text,
          })) || [],
      };

    case "FAQPage":
      return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity:
          frontmatter.faqItems?.map((item) => ({
            "@type": "Question" as const,
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer" as const,
              text: item.answer,
            },
          })) || [],
      };

    case "Article":
    default:
      return {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: frontmatter.title,
        description: frontmatter.description,
        datePublished: frontmatter.publishedAt,
        dateModified,
        author: {
          "@type": author?.role === "Organization" ? "Organization" : "Person",
          name: author?.name || frontmatter.author,
          ...(author?.social?.github && {
            url: `https://github.com/${author.social.github}`,
          }),
        },
        publisher: {
          "@type": "Organization",
          name: "MCServerJars",
          url: siteConfig.url,
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": guideUrl,
        },
        ...(frontmatter.ogImage && {
          image: `${siteConfig.url}${frontmatter.ogImage}`,
        }),
      };
  }
}

export function generateBreadcrumbSchema(
  items: Array<{ label: string; href?: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteConfig.url,
      },
      ...items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 2,
        name: item.label,
        ...(item.href && { item: `${siteConfig.url}${item.href}` }),
      })),
    ],
  };
}
