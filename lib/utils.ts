import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cx(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const focusRing = [
  "outline outline-offset-2 outline-0 focus-visible:outline-2",
  "outline-primary/50 dark:outline-primary/50",
];

export function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "—";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function formatDate(dateString: string | null): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export function compareVersions(a: string, b: string): number {
  const parseVersion = (v: string) =>
    v.split(".").map((n) => parseInt(n, 10) || 0);
  const aParts = parseVersion(a);
  const bParts = parseVersion(b);
  const maxLen = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < maxLen; i++) {
    const aNum = aParts[i] || 0;
    const bNum = bParts[i] || 0;
    if (aNum !== bNum) return bNum - aNum; // Descending order
  }
  return 0;
}

export function getCategoryLabel(
  category: string
): "Servers" | "Proxies" | "Mod Loaders" | "Hybrids" {
  const labels: Record<
    string,
    "Servers" | "Proxies" | "Mod Loaders" | "Hybrids"
  > = {
    server: "Servers",
    proxy: "Proxies",
    modloader: "Mod Loaders",
    hybrid: "Hybrids",
  };
  return labels[category] || "Servers";
}
