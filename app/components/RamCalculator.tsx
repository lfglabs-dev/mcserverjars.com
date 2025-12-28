"use client";

import { useMemo, useState } from "react";
import { RiFileCopyLine, RiCheckLine } from "@remixicon/react";
import { cx } from "@/lib/utils";

type ServerType = "vanilla" | "paper" | "modded";

const serverTypeLabels: Record<ServerType, string> = {
  vanilla: "Vanilla",
  paper: "Paper / Spigot / Purpur",
  modded: "Modded (Fabric / Forge)",
};

const baseRamByType: Record<ServerType, number> = {
  vanilla: 1.5,
  paper: 2,
  modded: 3,
};

const playerRamByType: Record<ServerType, number> = {
  vanilla: 0.08,
  paper: 0.1,
  modded: 0.14,
};

function roundHalf(value: number) {
  return Math.round(value * 2) / 2;
}

export function RamCalculator() {
  const [players, setPlayers] = useState(10);
  const [serverType, setServerType] = useState<ServerType>("paper");
  const [viewDistance, setViewDistance] = useState(8);
  const [addOns, setAddOns] = useState(15);
  const [copied, setCopied] = useState(false);

  const estimate = useMemo(() => {
    const base = baseRamByType[serverType];
    const perPlayer = playerRamByType[serverType];
    const viewPenalty = Math.max(0, viewDistance - 6) * 0.2;
    const addOnPenalty = addOns * (serverType === "modded" ? 0.05 : 0.03);
    const raw = base + players * perPlayer + viewPenalty + addOnPenalty;
    const recommended = Math.max(2, roundHalf(raw));
    const upper = Math.max(recommended, roundHalf(raw + 1));

    return {
      recommended,
      upper,
    };
  }, [players, serverType, viewDistance, addOns]);

  const flags = `-Xms${estimate.recommended}G -Xmx${estimate.recommended}G`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(flags);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Expected Players (peak)
            </label>
            <input
              type="number"
              min={1}
              max={500}
              value={players}
              onChange={(e) => setPlayers(Number(e.target.value || 0))}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Server Type</label>
            <select
              value={serverType}
              onChange={(e) => setServerType(e.target.value as ServerType)}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {Object.entries(serverTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              View Distance: {viewDistance}
            </label>
            <input
              type="range"
              min={4}
              max={16}
              value={viewDistance}
              onChange={(e) => setViewDistance(Number(e.target.value || 0))}
              className="w-full h-2 bg-[var(--bg-subtle)] rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-[var(--text-subtle)] mt-1">
              <span>4</span>
              <span>16</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {serverType === "modded" ? "Mods" : "Plugins"} Installed
            </label>
            <input
              type="number"
              min={0}
              max={500}
              value={addOns}
              onChange={(e) => setAddOns(Number(e.target.value || 0))}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-[var(--text-subtle)] mt-1">
              Large modpacks or heavy plugins can require more RAM.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5 space-y-4">
          <div>
            <p className="text-sm text-[var(--text-subtle)]">Suggested Allocation</p>
            <div className="text-3xl font-semibold">
              {estimate.recommended} - {estimate.upper} GB
            </div>
            <p className="text-sm text-[var(--text-muted)] mt-2">
              Start at the lower number and increase if you see lag or memory warnings.
            </p>
          </div>

          <div>
            <p className="text-sm text-[var(--text-subtle)]">Starter Flags</p>
            <div className="mt-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3 font-mono text-sm">
              {flags}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleCopy}
                className={cx(
                  "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                  copied
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                    : "border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)]"
                )}
              >
                {copied ? (
                  <RiCheckLine className="h-4 w-4" />
                ) : (
                  <RiFileCopyLine className="h-4 w-4" />
                )}
                {copied ? "Copied" : "Copy flags"}
              </button>
            </div>
          </div>

          <div className="text-xs text-[var(--text-subtle)] space-y-2">
            <p>Allocate the same value to -Xms and -Xmx for stable GC behavior.</p>
            <p>Leave at least 2GB RAM for the operating system and other services.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
