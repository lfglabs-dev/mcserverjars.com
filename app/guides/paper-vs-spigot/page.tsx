import { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "../../siteConfig";
import { Breadcrumb } from "../../components/Breadcrumb";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Paper vs Spigot: Which Minecraft Server Software Should You Use?",
  description:
    "Compare Paper and Spigot server software. Learn the differences in performance, plugin compatibility, and features to choose the best option for your Minecraft server.",
  alternates: {
    canonical: `${siteConfig.url}/guides/paper-vs-spigot`,
  },
  openGraph: {
    title: "Paper vs Spigot: Complete Comparison Guide",
    description:
      "Find out which Minecraft server software is right for you. Performance benchmarks, plugin support, and feature comparison.",
    url: `${siteConfig.url}/guides/paper-vs-spigot`,
  },
};

export default function PaperVsSpigotGuide() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Paper vs Spigot: Which Minecraft Server Software Should You Use?",
    description:
      "Compare Paper and Spigot server software for your Minecraft server.",
    author: {
      "@type": "Organization",
      name: "MCServerJars",
    },
    publisher: {
      "@type": "Organization",
      name: "MCServerJars",
      url: siteConfig.url,
    },
    datePublished: "2025-01-01",
    dateModified: new Date().toISOString().split("T")[0],
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
              { label: "Guides", href: "/guides" },
              { label: "Paper vs Spigot" },
            ]}
          />

          <article className="prose-custom">
            <h1>Paper vs Spigot: Which Should You Use?</h1>

            <p className="lead">
              Choosing between Paper and Spigot is one of the first decisions
              you will make when setting up a Minecraft server. Both are
              excellent options, but they serve different needs.
            </p>

            <h2>Quick Answer</h2>

            <p>
              <strong>Use Paper</strong> if you want the best performance and
              stability. Paper is a fork of Spigot that includes additional
              optimizations and bug fixes.
            </p>

            <p>
              <strong>Use Spigot</strong> if you need maximum compatibility with
              older plugins or prefer a more conservative approach to changes.
            </p>

            <h2>What is Spigot?</h2>

            <p>
              Spigot is a modified Minecraft server that improves performance
              over the vanilla server. It was created as a fork of CraftBukkit
              and has been the foundation for plugin development since 2012.
            </p>

            <p>Key features of Spigot:</p>
            <ul>
              <li>Plugin support via the Bukkit API</li>
              <li>Configuration options for server optimization</li>
              <li>Active community and plugin ecosystem</li>
              <li>Must be built using BuildTools</li>
            </ul>

            <h2>What is Paper?</h2>

            <p>
              Paper is a fork of Spigot that focuses on performance
              improvements and bug fixes. It maintains full compatibility with
              Spigot plugins while adding its own API extensions.
            </p>

            <p>Key features of Paper:</p>
            <ul>
              <li>Significant performance improvements over Spigot</li>
              <li>Fixes for vanilla Minecraft bugs and exploits</li>
              <li>Extended API for plugin developers</li>
              <li>Pre-built jars available for download</li>
              <li>Active development with frequent updates</li>
            </ul>

            <h2>Performance Comparison</h2>

            <p>
              Paper consistently outperforms Spigot in benchmarks. The Paper
              team has implemented numerous optimizations including:
            </p>

            <ul>
              <li>Async chunk loading and saving</li>
              <li>Optimized entity tracking</li>
              <li>Improved tick scheduling</li>
              <li>Better memory management</li>
            </ul>

            <p>
              For most servers, Paper will handle 20-50% more players at the
              same TPS compared to Spigot.
            </p>

            <h2>Plugin Compatibility</h2>

            <p>
              Paper is fully compatible with Spigot plugins. Any plugin that
              works on Spigot will work on Paper. However, Paper also offers
              its own extended API that some plugins take advantage of for
              better performance.
            </p>

            <h2>Which Should You Choose?</h2>

            <p>
              For the vast majority of servers, <strong>Paper is the better choice</strong>.
              It offers better performance, more bug fixes, and is just as easy
              to set up.
            </p>

            <p>Consider Spigot only if:</p>
            <ul>
              <li>You have a specific plugin that requires Spigot</li>
              <li>You need behavior that Paper has changed for stability</li>
              <li>You prefer building your server jar yourself</li>
            </ul>

            <h2>Download Links</h2>

            <p>
              Ready to get started? Download the latest versions:
            </p>

            <ul>
              <li>
                <Link href="/paper" className="text-primary hover:underline">
                  Download Paper Server
                </Link>
              </li>
              <li>
                <Link href="/spigot" className="text-primary hover:underline">
                  Download Spigot Server
                </Link>
              </li>
            </ul>
          </article>
        </div>
      </div>
    </>
  );
}

