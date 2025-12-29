# MCServerJars

The authoritative registry for Minecraft server jars. Download Paper, Spigot, Vanilla, Fabric, Forge, and more.

## Overview

MCServerJars is a programmatic SEO-focused registry for Minecraft server software. It provides:

- **Exhaustive coverage** of all major jar types and Minecraft versions
- **Always up-to-date** metadata via automated indexing
- **Direct downloads** from official sources
- **Verified checksums** for security

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

## Deployment

- **Frontend**: Vercel (auto-deploy from GitHub)
- **API**: Hetzner VPS via SSH (see `.cursor/rules/deployment.mdc`)
- **Indexers**: GitHub Actions (cron every 30 minutes)

## License

Copyright © Thomas Marchand. All rights reserved.

---

<p align="center">
  <sub>Created by <a href="https://thomas.md">Th0rgal</a> • Also check out <a href="https://hackedserver.org">HackedServer</a> and <a href="https://asyncanticheat.com">Async AntiCheat</a></sub>
</p>

### Keywords

minecraft server jar, paper server download, spigot download, minecraft vanilla server, fabric server, forge server, purpur download, velocity proxy, bungeecord download, minecraft server software, paper 1.21, spigot 1.21, minecraft server hosting, craftbukkit download, pufferfish server, folia download, neoforge server, mohist server, arclight server, sponge server, waterfall proxy, minecraft java server
