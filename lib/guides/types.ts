export type GuideCategory =
  | "setup"
  | "optimization"
  | "comparisons"
  | "troubleshooting"
  | "tools";

export type SchemaType = "Article" | "HowTo" | "FAQPage";

export interface FAQItem {
  question: string;
  answer: string;
}

export interface HowToStep {
  name: string;
  text: string;
}

export interface GuideFrontmatter {
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  author: string;
  category: GuideCategory;
  tags: string[];
  readingTime?: number;
  featured?: boolean;
  draft?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
  schemaType: SchemaType;
  faqItems?: FAQItem[];
  howToSteps?: HowToStep[];
}

export interface Guide {
  slug: string;
  category: GuideCategory;
  frontmatter: GuideFrontmatter;
  content: string;
}

export interface Author {
  name: string;
  slug: string;
  role?: string;
  avatar?: string;
  bio?: string;
  social?: {
    twitter?: string;
    github?: string;
  };
}

export const CATEGORY_LABELS: Record<GuideCategory, string> = {
  setup: "Setup Guides",
  optimization: "Optimization",
  comparisons: "Comparisons",
  troubleshooting: "Troubleshooting",
  tools: "Tools",
};

export const CATEGORY_DESCRIPTIONS: Record<GuideCategory, string> = {
  setup: "Step-by-step guides to set up your Minecraft server",
  optimization: "Performance tuning and server optimization tips",
  comparisons: "In-depth comparisons of server software options",
  troubleshooting: "Solutions to common server problems",
  tools: "Interactive utilities for server administrators",
};

export const CATEGORIES: GuideCategory[] = [
  "setup",
  "optimization",
  "comparisons",
  "troubleshooting",
  "tools",
];
