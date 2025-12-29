# MCServerJars

The authoritative Minecraft server jar registry and download index for PaperMC, Spigot, Vanilla, Fabric, Forge, and more.

MCServerJars helps you find the right Minecraft server software version fast, with verified checksums and official source downloads.

![MCServerJars homepage showing Minecraft server jar version list and download buttons](public/og-image.jpg)

## Table of Contents

- [Overview](#overview)
- [Quick Start: Download a Minecraft Server JAR](#quick-start-download-a-minecraft-server-jar)
- [Project Comparisons](#project-comparisons)
- [Supported Projects](#supported-projects)
- [API Endpoints](#api-endpoints)
- [SEO Features](#seo-features)
- [FAQ](#faq)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Development](#development)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [License](#license)

## Overview

MCServerJars is a programmatic Minecraft server jar registry focused on fast discovery, reliable metadata, and clean, crawlable pages. It provides:

- **Exhaustive coverage** of all major jar types and Minecraft versions
- **Always up-to-date** metadata via automated indexing
- **Direct downloads** from official sources
- **Verified checksums** for security
- **Version-first browsing** for PaperMC, Spigot, Purpur, Fabric, Forge, and more

## Quick Start: Download a Minecraft Server JAR

1. Open [mcserverjars.com](https://mcserverjars.com).
2. Pick a project (Paper, Spigot, Purpur, Vanilla, Fabric, Forge, NeoForge, etc.).
3. Choose your Minecraft version (e.g., 1.21.4).
4. Download the latest build or a specific build number.
5. Verify the checksum before running the jar.

## Project Comparisons

### Paper vs Spigot vs Purpur
- **Paper**: performance-focused fork with wide plugin compatibility
- **Spigot**: the classic plugin server with broad ecosystem support
- **Purpur**: Paper-based fork with extra configuration and gameplay options

### Fabric vs Forge vs NeoForge
- **Fabric**: lightweight mod loader with fast version updates
- **Forge**: long-established mod loader with a large mod ecosystem
- **NeoForge**: modern fork focused on improved tooling and maintainability

### Velocity vs BungeeCord vs Waterfall
- **Velocity**: modern proxy with strong security defaults
- **BungeeCord**: legacy proxy with wide plugin support
- **Waterfall**: performance-enhanced fork of BungeeCord

## Supported Projects

### Server Software
- Paper, Spigot, CraftBukkit, Vanilla, Purpur, Pufferfish, Folia

### Proxy Software
- Velocity, BungeeCord, Waterfall

### Mod Loaders
- Fabric, Forge, NeoForge

### Hybrid Servers
- Sponge, Mohist, Arclight

## API Endpoints

```
GET /v1/projects                              # List all projects
GET /v1/projects/:slug                        # Get project details
GET /v1/projects/:slug/versions               # List versions
GET /v1/projects/:slug/versions/:version      # List builds
GET /v1/projects/:slug/versions/:version/latest  # Get latest build
```

## SEO Features

- Static generation with ISR (hourly revalidation)
- Clean URLs: `/paper`, `/paper/1.21.4`, `/paper/1.21.4/123`
- JSON-LD structured data
- Dynamic XML sitemap
- Keyword-optimized meta tags
- Update cadence every 30 minutes via automated indexing

## FAQ

**Is it safe to download Minecraft server jars here?**  
Yes. Downloads link to official sources and include verified checksums for integrity.

**Do you host the jar files?**  
No. MCServerJars indexes official sources and provides direct download links.

**How do I find the latest Paper build for a specific version?**  
Use the project’s version page or the `latest` API endpoint for that version.

**What’s the difference between Paper and Spigot?**  
Paper is a performance-focused fork of Spigot with additional optimizations and fixes.

**How often is the registry updated?**  
Indexers run on a 30‑minute schedule to keep metadata fresh.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router) + React 19 |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Backend API | Rust (Axum) |
| Automation | GitHub Actions |
| Deployment | Vercel (frontend), Hetzner VPS (API) |

## Project Structure

```
mcserverjars.com/
├── app/                    # Next.js App Router
│   ├── [project]/          # Dynamic project pages
│   ├── components/         # React components
│   └── siteConfig.ts       # Site configuration
├── lib/                    # Shared utilities
├── indexers/               # Automated indexing scripts
├── backend/                # Rust API server
└── .github/workflows/      # CI/CD
```

## Development

### Prerequisites

- [Bun](https://bun.sh) (runtime & package manager)
- [Rust](https://rustup.rs) (for backend development)
- [Docker](https://docker.com) (for BuildTools)

### Frontend

```bash
cd mcserverjars.com/
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Backend API

```bash
cd backend/
cargo run
```

API runs on [http://localhost:3001](http://localhost:3001).

### Indexers

```bash
cd indexers/
bun install
bun run index-paper.ts
```

## Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Deployment

- **Frontend**: Vercel (auto-deploy from GitHub)
- **API**: Hetzner VPS via SSH
- **Indexers**: GitHub Actions (cron every 30 minutes)

## License

Copyright © Thomas Marchand. All rights reserved.

---

<p align="center">
  <sub>Created by <a href="https://thomas.md">Th0rgal</a> • Also check out <a href="https://hackedserver.org">HackedServer</a> and <a href="https://asyncanticheat.com">Async AntiCheat</a></sub>
</p>

### Keywords

minecraft server jar, paper server download, spigot download, minecraft vanilla server, fabric server, forge server, purpur download, velocity proxy, bungeecord download, minecraft server software, paper 1.21, spigot 1.21, minecraft server hosting, craftbukkit download, pufferfish server, folia download, neoforge server, mohist server, arclight server, sponge server, waterfall proxy, minecraft java server
