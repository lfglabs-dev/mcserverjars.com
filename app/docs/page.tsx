import { Metadata } from "next";
import Link from "next/link";
import { RiArrowRightLine, RiCodeLine, RiServerLine, RiDownloadLine, RiListCheck } from "@remixicon/react";

export const metadata: Metadata = {
  title: "API Documentation | MCServerJars",
  description:
    "REST API documentation for MCServerJars. Access Minecraft server jar metadata, download URLs, and version information programmatically.",
  keywords: [
    "MCServerJars API",
    "Minecraft server API",
    "Paper API",
    "Spigot API",
    "server jar download API",
    "REST API",
    "Minecraft server metadata",
  ],
  openGraph: {
    title: "API Documentation | MCServerJars",
    description:
      "REST API documentation for MCServerJars. Access Minecraft server jar metadata programmatically.",
    type: "website",
  },
};

const API_BASE = "https://api.mcserverjars.com";

interface Endpoint {
  method: "GET" | "POST";
  path: string;
  description: string;
  example?: string;
  response?: string;
}

const endpoints: Endpoint[] = [
  {
    method: "GET",
    path: "/v1/projects",
    description: "List all available server software projects",
    example: `${API_BASE}/v1/projects`,
    response: `[
  {
    "id": "paper",
    "name": "Paper",
    "description": "High performance Spigot fork",
    "category": "servers"
  },
  ...
]`,
  },
  {
    method: "GET",
    path: "/v1/projects/:slug",
    description: "Get details for a specific project",
    example: `${API_BASE}/v1/projects/paper`,
    response: `{
  "id": "paper",
  "name": "Paper",
  "description": "High performance Spigot fork",
  "category": "servers",
  "website": "https://papermc.io"
}`,
  },
  {
    method: "GET",
    path: "/v1/projects/:slug/versions",
    description: "List all Minecraft versions available for a project",
    example: `${API_BASE}/v1/projects/paper/versions`,
    response: `[
  "1.21.4",
  "1.21.3",
  "1.21.1",
  ...
]`,
  },
  {
    method: "GET",
    path: "/v1/projects/:slug/versions/:version",
    description: "List all builds for a specific version",
    example: `${API_BASE}/v1/projects/paper/versions/1.21.4`,
    response: `[
  {
    "build": 123,
    "download_url": "https://...",
    "sha256": "abc123...",
    "created_at": "2024-01-15T12:00:00Z"
  },
  ...
]`,
  },
  {
    method: "GET",
    path: "/v1/projects/:slug/versions/:version/latest",
    description: "Get the latest build for a specific version",
    example: `${API_BASE}/v1/projects/paper/versions/1.21.4/latest`,
    response: `{
  "build": 123,
  "download_url": "https://...",
  "sha256": "abc123...",
  "created_at": "2024-01-15T12:00:00Z"
}`,
  },
  {
    method: "GET",
    path: "/v1/nms-mappings",
    description: "Get all Minecraft to NMS revision mappings",
    example: `${API_BASE}/v1/nms-mappings`,
    response: `[
  {
    "minecraft_version": "1.21.4",
    "nms_revision": "v1_21_R3",
    "craftbukkit_package": "org.bukkit.craftbukkit.v1_21_R3"
  },
  ...
]`,
  },
  {
    method: "GET",
    path: "/v1/nms-mappings/:version",
    description: "Get NMS revision for a specific Minecraft version",
    example: `${API_BASE}/v1/nms-mappings/1.21.4`,
    response: `{
  "minecraft_version": "1.21.4",
  "nms_revision": "v1_21_R3",
  "craftbukkit_package": "org.bukkit.craftbukkit.v1_21_R3"
}`,
  },
];

const features = [
  {
    icon: RiServerLine,
    title: "All Server Types",
    description: "Paper, Spigot, CraftBukkit, Vanilla, Purpur, and more",
  },
  {
    icon: RiDownloadLine,
    title: "Direct Downloads",
    description: "Get verified download URLs with SHA256 checksums",
  },
  {
    icon: RiListCheck,
    title: "Version Metadata",
    description: "Complete build history and version information",
  },
  {
    icon: RiCodeLine,
    title: "NMS Mappings",
    description: "Minecraft to CraftBukkit revision mappings",
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-4 pt-16 pb-12 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-medium mb-6">
            <RiCodeLine className="h-4 w-4" />
            REST API
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            API Documentation
          </h1>

          <p className="text-lg text-[var(--text-muted)] max-w-xl mx-auto mb-8">
            Access Minecraft server jar metadata, download URLs, and version
            information programmatically.
          </p>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] font-mono text-sm">
            <span className="text-[var(--text-muted)]">Base URL:</span>
            <code className="text-blue-500">{API_BASE}</code>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="mx-auto max-w-4xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)]"
            >
              <feature.icon className="h-5 w-5 text-blue-500 mb-2" />
              <h3 className="font-medium text-sm mb-1">{feature.title}</h3>
              <p className="text-xs text-[var(--text-muted)]">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Endpoints */}
      <div className="mx-auto max-w-4xl px-4 pb-16 sm:px-6 lg:px-8">
        <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-6">
          Endpoints
        </h2>

        <div className="space-y-6">
          {endpoints.map((endpoint, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-[var(--border-subtle)] overflow-hidden"
            >
              <div className="flex items-center gap-3 p-4 bg-[var(--bg-card)]">
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  {endpoint.method}
                </span>
                <code className="text-sm font-medium">{endpoint.path}</code>
              </div>

              <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
                <p className="text-sm text-[var(--text-muted)] mb-4">
                  {endpoint.description}
                </p>

                {endpoint.example && (
                  <div className="mb-4">
                    <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      Example
                    </span>
                    <a
                      href={endpoint.example}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mt-1 p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] font-mono text-xs text-blue-500 hover:text-blue-400 hover:bg-blue-500/5 transition-colors truncate"
                    >
                      {endpoint.example}
                    </a>
                  </div>
                )}

                {endpoint.response && (
                  <div>
                    <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      Response
                    </span>
                    <pre className="mt-1 p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] overflow-x-auto text-xs">
                      <code>{endpoint.response}</code>
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Related Links */}
      <div className="mx-auto max-w-4xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-subtle)] border border-[var(--border-subtle)] p-6">
          <h3 className="font-semibold mb-4">Related Resources</h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/developers/nms"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm hover:border-blue-500/50 transition-colors"
            >
              NMS Version Mappings
              <RiArrowRightLine className="h-4 w-4" />
            </Link>
            <a
              href="https://github.com/lfglabs-dev/mcserverjars.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-sm hover:border-blue-500/50 transition-colors"
            >
              GitHub Repository
              <RiArrowRightLine className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

