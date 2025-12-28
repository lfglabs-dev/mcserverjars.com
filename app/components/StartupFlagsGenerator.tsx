"use client";

import { useState, useMemo } from "react";
import { RiFileCopyLine, RiCheckLine, RiInformationLine } from "@remixicon/react";
import { cx } from "@/lib/utils";

type JavaVersion = "8" | "11" | "17" | "21";
type ServerType = "paper" | "fabric" | "forge" | "vanilla";

interface FlagExplanation {
  flag: string;
  description: string;
}

const javaVersionLabels: Record<JavaVersion, string> = {
  "8": "Java 8 (Legacy)",
  "11": "Java 11",
  "17": "Java 17",
  "21": "Java 21 (Recommended)",
};

const serverTypeLabels: Record<ServerType, string> = {
  paper: "Paper / Spigot / Purpur",
  fabric: "Fabric",
  forge: "Forge / NeoForge",
  vanilla: "Vanilla",
};

function generateFlags(
  ramGb: number,
  javaVersion: JavaVersion,
  serverType: ServerType,
  useExperimental: boolean
): { flags: string; explanations: FlagExplanation[] } {
  const explanations: FlagExplanation[] = [];
  const flags: string[] = [];

  // Determine if we should use ZGC
  const useZGC = useExperimental && parseInt(javaVersion) >= 17;

  // Memory allocation
  flags.push(`-Xms${ramGb}G`);
  flags.push(`-Xmx${ramGb}G`);
  explanations.push({
    flag: `-Xms${ramGb}G -Xmx${ramGb}G`,
    description: `Allocate ${ramGb}GB of RAM. Setting min and max equal prevents memory resizing overhead.`,
  });

  flags.push("-XX:+UnlockExperimentalVMOptions");
  flags.push("-XX:+DisableExplicitGC");
  explanations.push({
    flag: "-XX:+DisableExplicitGC",
    description: "Prevent plugins from forcing full garbage collections.",
  });

  if (useZGC) {
    // ZGC flags for extremely low pause times
    flags.push("-XX:+UseZGC");
    flags.push("-XX:+ZGenerational");
    explanations.push({
      flag: "-XX:+UseZGC -XX:+ZGenerational",
      description: "Use ZGC for extremely low GC pause times (experimental, may increase CPU usage).",
    });
  } else {
    // G1GC flags (Aikar's flags)
    flags.push("-XX:+UseG1GC");
    explanations.push({
      flag: "-XX:+UseG1GC",
      description: "Use the G1 garbage collector, optimized for low-latency applications.",
    });

    flags.push("-XX:+ParallelRefProcEnabled");
    explanations.push({
      flag: "-XX:+ParallelRefProcEnabled",
      description: "Enable parallel reference processing to reduce GC pause times.",
    });

    flags.push("-XX:MaxGCPauseMillis=200");
    explanations.push({
      flag: "-XX:MaxGCPauseMillis=200",
      description: "Target maximum GC pause time of 200ms for smooth gameplay.",
    });

    // G1 region size based on RAM
    const g1HeapRegionSize = ramGb >= 12 ? "16M" : "8M";

    flags.push("-XX:G1NewSizePercent=30");
    flags.push("-XX:G1MaxNewSizePercent=40");
    flags.push(`-XX:G1HeapRegionSize=${g1HeapRegionSize}`);
    explanations.push({
      flag: `-XX:G1HeapRegionSize=${g1HeapRegionSize}`,
      description: `Set G1 region size to ${g1HeapRegionSize} based on ${ramGb}GB heap.`,
    });

    flags.push("-XX:G1ReservePercent=20");
    flags.push("-XX:G1HeapWastePercent=5");
    flags.push("-XX:G1MixedGCCountTarget=4");

    flags.push("-XX:InitiatingHeapOccupancyPercent=15");
    explanations.push({
      flag: "-XX:InitiatingHeapOccupancyPercent=15",
      description: "Start GC earlier to prevent memory pressure spikes.",
    });

    flags.push("-XX:G1MixedGCLiveThresholdPercent=90");
    flags.push("-XX:G1RSetUpdatingPauseTimePercent=5");
    flags.push("-XX:SurvivorRatio=32");
    flags.push("-XX:+PerfDisableSharedMem");
    flags.push("-XX:MaxTenuringThreshold=1");

    // String deduplication only works with G1GC
    if (parseInt(javaVersion) >= 11) {
      flags.push("-XX:+UseStringDeduplication");
      explanations.push({
        flag: "-XX:+UseStringDeduplication",
        description: "Reduce memory usage by deduplicating identical strings.",
      });
    }
  }

  // Server type specific
  if (serverType === "paper" || serverType === "fabric") {
    flags.push("-Daikars.new.flags=true");
  }

  // JAR and nogui
  flags.push("-jar server.jar");
  flags.push("--nogui");

  return {
    flags: `java ${flags.join(" ")}`,
    explanations,
  };
}

export function StartupFlagsGenerator() {
  const [ram, setRam] = useState(4);
  const [javaVersion, setJavaVersion] = useState<JavaVersion>("21");
  const [serverType, setServerType] = useState<ServerType>("paper");
  const [useExperimental, setUseExperimental] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showExplanations, setShowExplanations] = useState(false);

  const { flags, explanations } = useMemo(
    () => generateFlags(ram, javaVersion, serverType, useExperimental),
    [ram, javaVersion, serverType, useExperimental]
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(flags);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* RAM Slider */}
        <div>
          <label className="block text-sm font-medium mb-2">
            RAM Allocation: {ram}GB
          </label>
          <input
            type="range"
            min={1}
            max={32}
            value={ram}
            onChange={(e) => setRam(parseInt(e.target.value))}
            className="w-full h-2 bg-[var(--bg-subtle)] rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-xs text-[var(--text-subtle)] mt-1">
            <span>1GB</span>
            <span>32GB</span>
          </div>
        </div>

        {/* Java Version */}
        <div>
          <label className="block text-sm font-medium mb-2">Java Version</label>
          <select
            value={javaVersion}
            onChange={(e) => setJavaVersion(e.target.value as JavaVersion)}
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {Object.entries(javaVersionLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Server Type */}
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

        {/* Experimental Toggle */}
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={useExperimental}
              onChange={(e) => setUseExperimental(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[var(--bg-subtle)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
          <span className="text-sm">
            Experimental flags (ZGC)
            {parseInt(javaVersion) < 17 && (
              <span className="text-[var(--text-subtle)]"> - Requires Java 17+</span>
            )}
          </span>
        </div>
      </div>

      {/* Generated Flags */}
      <div className="relative">
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 font-mono text-sm overflow-x-auto">
          <pre className="whitespace-pre-wrap break-all">{flags}</pre>
        </div>
        <button
          onClick={handleCopy}
          className={cx(
            "absolute right-2 top-2 p-2 rounded-md transition-all",
            "bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)]",
            "text-[var(--text-muted)] hover:text-[var(--foreground)]"
          )}
          title="Copy to clipboard"
        >
          {copied ? (
            <RiCheckLine className="h-4 w-4 text-emerald-500" />
          ) : (
            <RiFileCopyLine className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Toggle Explanations */}
      <button
        onClick={() => setShowExplanations(!showExplanations)}
        className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-primary transition-colors"
      >
        <RiInformationLine className="h-4 w-4" />
        {showExplanations ? "Hide" : "Show"} flag explanations
      </button>

      {/* Explanations */}
      {showExplanations && (
        <div className="space-y-3">
          {explanations.map((exp, i) => (
            <div
              key={i}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3"
            >
              <code className="text-sm text-primary">{exp.flag}</code>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                {exp.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
        <p className="text-sm text-[var(--text-muted)]">
          <strong className="text-amber-400">Note:</strong> These flags are based on
          Aikar&apos;s recommended flags for Minecraft servers. Adjust RAM allocation based on
          your server&apos;s needs - don&apos;t allocate more than you need.
        </p>
      </div>
    </div>
  );
}
