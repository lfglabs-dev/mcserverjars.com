import { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "../siteConfig";
import { RiArticleLine, RiArrowRightLine } from "@remixicon/react";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Minecraft Server Guides | MCServerJars",
  description:
    "Learn how to set up and optimize your Minecraft server. Guides for Paper, Spigot, Fabric, and more.",
  alternates: {
    canonical: `${siteConfig.url}/guides`,
  },
};

const guides = [
  {
    slug: "paper-vs-spigot",
    title: "Paper vs Spigot: Which Server Software Should You Use?",
    description:
      "Compare Paper and Spigot to find the best Minecraft server software for your needs. Performance, plugins, and features explained.",
    readingTime: "5 min read",
  },
  {
    slug: "how-to-install-paper",
    title: "How to Install a Paper Minecraft Server",
    description:
      "Step-by-step guide to setting up a Paper server from scratch. Download, configure, and launch your server in minutes.",
    readingTime: "8 min read",
  },
  {
    slug: "best-minecraft-server-software-2025",
    title: "Best Minecraft Server Software in 2025",
    description:
      "Complete guide to choosing the right server software. Paper, Purpur, Fabric, Forge, and more compared.",
    readingTime: "10 min read",
  },
];

export default function GuidesPage() {
  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Server Guides</h1>
          <p className="mt-2 text-[var(--text-muted)]">
            Learn how to set up, configure, and optimize your Minecraft server.
          </p>
        </header>

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
                  {guide.title}
                </h2>
                <p className="mt-1 text-sm text-[var(--text-muted)] line-clamp-2">
                  {guide.description}
                </p>
                <p className="mt-2 text-xs text-[var(--text-subtle)]">
                  {guide.readingTime}
                </p>
              </div>
              <RiArrowRightLine className="h-5 w-5 shrink-0 text-[var(--text-subtle)] group-hover:text-primary transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

