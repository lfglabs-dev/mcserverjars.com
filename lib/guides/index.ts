import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";
import type {
  Guide,
  GuideFrontmatter,
  GuideCategory,
  Author,
} from "./types";

const CONTENT_PATH = path.join(process.cwd(), "content");
const GUIDES_PATH = path.join(CONTENT_PATH, "guides");
const AUTHORS_PATH = path.join(CONTENT_PATH, "authors", "authors.json");

export async function getAllGuides(): Promise<Guide[]> {
  const guides: Guide[] = [];

  if (!fs.existsSync(GUIDES_PATH)) {
    return guides;
  }

  const categories = fs.readdirSync(GUIDES_PATH);

  for (const category of categories) {
    const categoryPath = path.join(GUIDES_PATH, category);
    const stat = fs.statSync(categoryPath);

    if (!stat.isDirectory()) continue;

    const files = fs
      .readdirSync(categoryPath)
      .filter((f) => f.endsWith(".mdx"));

    for (const file of files) {
      const filePath = path.join(categoryPath, file);
      const source = fs.readFileSync(filePath, "utf-8");
      const { data, content } = matter(source);
      const slug = file.replace(/\.mdx$/, "");

      const frontmatter = data as GuideFrontmatter;

      // Auto-calculate reading time if not provided
      if (!frontmatter.readingTime) {
        frontmatter.readingTime = Math.ceil(readingTime(content).minutes);
      }

      // Skip drafts
      if (frontmatter.draft) continue;

      guides.push({
        slug,
        category: category as GuideCategory,
        frontmatter,
        content,
      });
    }
  }

  // Sort by date, newest first
  return guides.sort(
    (a, b) =>
      new Date(b.frontmatter.publishedAt).getTime() -
      new Date(a.frontmatter.publishedAt).getTime()
  );
}

export async function getGuideBySlug(slug: string): Promise<Guide | null> {
  const guides = await getAllGuides();
  return guides.find((g) => g.slug === slug) || null;
}

export async function getGuidesByCategory(
  category: GuideCategory
): Promise<Guide[]> {
  const guides = await getAllGuides();
  return guides.filter((g) => g.category === category);
}

export async function getGuidesByTag(tag: string): Promise<Guide[]> {
  const guides = await getAllGuides();
  return guides.filter((g) =>
    g.frontmatter.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
  );
}

export async function getAllTags(): Promise<string[]> {
  const guides = await getAllGuides();
  const tags = new Set<string>();
  guides.forEach((g) => g.frontmatter.tags.forEach((t) => tags.add(t)));
  return Array.from(tags).sort();
}

export async function getFeaturedGuides(): Promise<Guide[]> {
  const guides = await getAllGuides();
  return guides.filter((g) => g.frontmatter.featured);
}

export async function getRelatedGuides(
  currentGuide: Guide,
  limit = 3
): Promise<Guide[]> {
  const guides = await getAllGuides();

  // Find guides with overlapping tags or same category
  const related = guides
    .filter((g) => g.slug !== currentGuide.slug)
    .map((g) => {
      let score = 0;

      // Same category: +2 points
      if (g.category === currentGuide.category) {
        score += 2;
      }

      // Overlapping tags: +1 point each
      const overlappingTags = g.frontmatter.tags.filter((t) =>
        currentGuide.frontmatter.tags.includes(t)
      );
      score += overlappingTags.length;

      return { guide: g, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.guide);

  return related;
}

export function getAuthors(): Author[] {
  if (!fs.existsSync(AUTHORS_PATH)) {
    return [];
  }
  const data = fs.readFileSync(AUTHORS_PATH, "utf-8");
  return JSON.parse(data);
}

export function getAuthorBySlug(slug: string): Author | null {
  const authors = getAuthors();
  return authors.find((a) => a.slug === slug) || null;
}

export function formatReadingTime(minutes: number): string {
  return `${minutes} min read`;
}

// Re-export types
export * from "./types";
