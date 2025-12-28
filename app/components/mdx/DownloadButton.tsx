import Link from "next/link";
import { RiDownloadLine } from "@remixicon/react";
import { cx } from "@/lib/utils";

interface DownloadButtonProps {
  project: string;
  label?: string;
  variant?: "primary" | "secondary";
}

const projectLabels: Record<string, string> = {
  paper: "Paper",
  spigot: "Spigot",
  vanilla: "Vanilla",
  fabric: "Fabric",
  forge: "Forge",
  purpur: "Purpur",
  velocity: "Velocity",
  bungeecord: "BungeeCord",
  waterfall: "Waterfall",
};

export function DownloadButton({
  project,
  label,
  variant = "primary",
}: DownloadButtonProps) {
  const displayLabel =
    label || `Download ${projectLabels[project] || project}`;

  return (
    <Link
      href={`/${project}`}
      className={cx(
        "inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors",
        variant === "primary"
          ? "bg-primary text-white hover:bg-primary/90"
          : "border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--foreground)] hover:bg-[var(--bg-hover)]"
      )}
    >
      <RiDownloadLine className="h-4 w-4" />
      {displayLabel}
    </Link>
  );
}
