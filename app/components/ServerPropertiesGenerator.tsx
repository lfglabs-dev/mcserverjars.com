"use client";

import { useMemo, useState } from "react";
import {
  RiFileCopyLine,
  RiCheckLine,
  RiDownloadLine,
  RiRestartLine,
} from "@remixicon/react";
import { cx } from "@/lib/utils";

type GameMode = "survival" | "creative" | "adventure" | "spectator";
type Difficulty = "peaceful" | "easy" | "normal" | "hard";

interface ServerPropertiesSettings {
  motd: string;
  maxPlayers: number;
  serverPort: number;
  gamemode: GameMode;
  difficulty: Difficulty;
  viewDistance: number;
  simulationDistance: number;
  onlineMode: boolean;
  pvp: boolean;
  allowFlight: boolean;
  allowNether: boolean;
  enableCommandBlock: boolean;
  spawnMonsters: boolean;
  spawnAnimals: boolean;
  spawnNpcs: boolean;
  generateStructures: boolean;
  whiteList: boolean;
  levelSeed: string;
}

const defaultSettings: ServerPropertiesSettings = {
  motd: "A Minecraft Server",
  maxPlayers: 20,
  serverPort: 25565,
  gamemode: "survival",
  difficulty: "normal",
  viewDistance: 8,
  simulationDistance: 6,
  onlineMode: true,
  pvp: true,
  allowFlight: false,
  allowNether: true,
  enableCommandBlock: false,
  spawnMonsters: true,
  spawnAnimals: true,
  spawnNpcs: true,
  generateStructures: true,
  whiteList: false,
  levelSeed: "",
};

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {description && (
          <div className="text-xs text-[var(--text-subtle)] mt-1">
            {description}
          </div>
        )}
      </div>
      <span className="relative inline-flex items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <span className="w-11 h-6 bg-[var(--bg-subtle)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></span>
      </span>
    </label>
  );
}

function buildProperties(settings: ServerPropertiesSettings): string {
  const lines: Array<[string, string | number | boolean]> = [
    ["motd", settings.motd],
    ["max-players", settings.maxPlayers],
    ["server-port", settings.serverPort],
    ["gamemode", settings.gamemode],
    ["difficulty", settings.difficulty],
    ["view-distance", settings.viewDistance],
    ["simulation-distance", settings.simulationDistance],
    ["online-mode", settings.onlineMode],
    ["pvp", settings.pvp],
    ["allow-flight", settings.allowFlight],
    ["allow-nether", settings.allowNether],
    ["enable-command-block", settings.enableCommandBlock],
    ["spawn-monsters", settings.spawnMonsters],
    ["spawn-animals", settings.spawnAnimals],
    ["spawn-npcs", settings.spawnNpcs],
    ["generate-structures", settings.generateStructures],
    ["white-list", settings.whiteList],
    ["level-seed", settings.levelSeed],
  ];

  return lines.map(([key, value]) => `${key}=${String(value)}`).join("\n");
}

export function ServerPropertiesGenerator() {
  const [settings, setSettings] = useState<ServerPropertiesSettings>(
    defaultSettings
  );
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const propertiesText = useMemo(
    () => buildProperties(settings),
    [settings]
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(propertiesText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([propertiesText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "server.properties";
    anchor.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  const handleReset = () => setSettings(defaultSettings);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">
                Server Name (MOTD)
              </label>
              <input
                type="text"
                value={settings.motd}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, motd: e.target.value }))
                }
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="A Minecraft Server"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Max Players
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={settings.maxPlayers}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    maxPlayers: Number(e.target.value || 0),
                  }))
                }
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Game Mode
              </label>
              <select
                value={settings.gamemode}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    gamemode: e.target.value as GameMode,
                  }))
                }
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="survival">Survival</option>
                <option value="creative">Creative</option>
                <option value="adventure">Adventure</option>
                <option value="spectator">Spectator</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Difficulty
              </label>
              <select
                value={settings.difficulty}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    difficulty: e.target.value as Difficulty,
                  }))
                }
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="peaceful">Peaceful</option>
                <option value="easy">Easy</option>
                <option value="normal">Normal</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Server Port
              </label>
              <input
                type="number"
                min={1}
                max={65535}
                value={settings.serverPort}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    serverPort: Number(e.target.value || 0),
                  }))
                }
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Level Seed (optional)
              </label>
              <input
                type="text"
                value={settings.levelSeed}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    levelSeed: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Leave blank for random"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">
                View Distance: {settings.viewDistance}
              </label>
              <input
                type="range"
                min={2}
                max={16}
                value={settings.viewDistance}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    viewDistance: Number(e.target.value || 0),
                  }))
                }
                className="w-full h-2 bg-[var(--bg-subtle)] rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-[var(--text-subtle)] mt-1">
                <span>2</span>
                <span>16</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Simulation Distance: {settings.simulationDistance}
              </label>
              <input
                type="range"
                min={2}
                max={16}
                value={settings.simulationDistance}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    simulationDistance: Number(e.target.value || 0),
                  }))
                }
                className="w-full h-2 bg-[var(--bg-subtle)] rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-[var(--text-subtle)] mt-1">
                <span>2</span>
                <span>16</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Toggle
            label="Online Mode"
            description="Verify players with Mojang (recommended)"
            checked={settings.onlineMode}
            onChange={(value) =>
              setSettings((prev) => ({ ...prev, onlineMode: value }))
            }
          />
          <Toggle
            label="PVP"
            description="Allow player versus player combat"
            checked={settings.pvp}
            onChange={(value) => setSettings((prev) => ({ ...prev, pvp: value }))}
          />
          <Toggle
            label="Allow Flight"
            description="Allow flying (useful for creative and Elytra)"
            checked={settings.allowFlight}
            onChange={(value) =>
              setSettings((prev) => ({ ...prev, allowFlight: value }))
            }
          />
          <Toggle
            label="Allow Nether"
            description="Enable Nether portal travel"
            checked={settings.allowNether}
            onChange={(value) =>
              setSettings((prev) => ({ ...prev, allowNether: value }))
            }
          />
          <Toggle
            label="Enable Command Blocks"
            description="Let command blocks execute commands"
            checked={settings.enableCommandBlock}
            onChange={(value) =>
              setSettings((prev) => ({ ...prev, enableCommandBlock: value }))
            }
          />
          <Toggle
            label="Spawn Monsters"
            description="Control hostile mob spawning"
            checked={settings.spawnMonsters}
            onChange={(value) =>
              setSettings((prev) => ({ ...prev, spawnMonsters: value }))
            }
          />
          <Toggle
            label="Spawn Animals"
            description="Control passive mob spawning"
            checked={settings.spawnAnimals}
            onChange={(value) =>
              setSettings((prev) => ({ ...prev, spawnAnimals: value }))
            }
          />
          <Toggle
            label="Spawn NPCs"
            description="Toggle villagers and other NPCs"
            checked={settings.spawnNpcs}
            onChange={(value) =>
              setSettings((prev) => ({ ...prev, spawnNpcs: value }))
            }
          />
          <Toggle
            label="Generate Structures"
            description="Villages, temples, and other structures"
            checked={settings.generateStructures}
            onChange={(value) =>
              setSettings((prev) => ({ ...prev, generateStructures: value }))
            }
          />
          <Toggle
            label="Whitelist"
            description="Require players to be whitelisted"
            checked={settings.whiteList}
            onChange={(value) =>
              setSettings((prev) => ({ ...prev, whiteList: value }))
            }
          />
        </div>
      </div>

      <div className="relative">
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 font-mono text-sm overflow-x-auto">
          <pre className="whitespace-pre-wrap break-words">
            {propertiesText}
          </pre>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
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
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={handleDownload}
            className={cx(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
              downloaded
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)]"
            )}
          >
            {downloaded ? (
              <RiCheckLine className="h-4 w-4" />
            ) : (
              <RiDownloadLine className="h-4 w-4" />
            )}
            {downloaded ? "Downloaded" : "Download"}
          </button>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <RiRestartLine className="h-4 w-4" />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
