# MCServerJars

The authoritative registry for Minecraft server jars. SEO-first website providing downloads for Paper, Spigot, Vanilla, Fabric, Forge, and more.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router) + React 19 + TypeScript 5 |
| Styling | Tailwind CSS v3 |
| Database | Supabase (PostgreSQL) |
| Backend API | Rust (Axum) at `api.mcserverjars.com` |
| Runtime | Bun |
| Deployment | Vercel (frontend), Hetzner VPS (API) |

## Project Structure

```
app/                    # Next.js App Router pages
├── [project]/          # Dynamic project pages (/paper)
│   ├── [version]/      # Version pages (/paper/1.21.4)
│   │   └── latest/     # Redirect to latest build
│   └── latest/         # Redirect to latest version
├── components/         # React components
└── siteConfig.ts       # Site configuration
lib/                    # Shared utilities and data fetching
indexers/               # GitHub Actions indexing scripts (Bun TS)
backend/                # Rust API server
```

## Commands

```bash
bun run dev     # Start dev server
bun run build   # Build for production
bun run lint    # Run ESLint
```

Backend: `cargo build --release` in `backend/`

## Code Conventions

### TypeScript & React
- Strict mode enabled; avoid `any`
- ESM imports only; no CommonJS
- Server components by default; `"use client"` only when needed
- Prefer early returns over nested conditionals
- Descriptive names; no 1-2 char identifiers

### Data Fetching
- Use server components for all data fetching
- All pages use ISR with `revalidate = 3600`
- Data comes from Supabase via `lib/jars.ts`
- No client-side data fetching for SEO pages

### Styling
- Tailwind CSS for all styling
- CSS variables for theming (in `globals.css`)
- Dark mode via `prefers-color-scheme`
- Use `cx()` utility for conditional classes

### SEO Requirements
Every page must have:
- Unique, keyword-rich title and meta description
- Canonical URL
- JSON-LD structured data (SoftwareApplication schema)
- Proper heading hierarchy (H1 -> H2 -> H3)
- Internal links to related pages
- "Last updated" for freshness signals

### URL Structure
```
/                       # Homepage - all projects
/paper                  # Project page - all versions
/paper/1.21.4           # Version page - all builds
/paper/latest           # Redirect to latest download
/paper/1.21.4/latest    # Redirect to latest build
```

## API Endpoints

```
GET /v1/projects                              # List all projects
GET /v1/projects/:slug                        # Get project details
GET /v1/projects/:slug/versions               # List versions
GET /v1/projects/:slug/versions/:version      # List builds
GET /v1/projects/:slug/versions/:version/latest  # Get latest build
```

## Database Schema

**Tables:**
- `jar_projects` - Project metadata
- `minecraft_versions` - Version registry
- `jar_builds` - Downloadable builds
- `jar_sync_logs` - Indexer history

**Conventions:**
- UUIDs for primary keys
- `TIMESTAMPTZ` for timestamps
- Always include `created_at` and `updated_at`
- snake_case for table/column names

## Indexers

- Run via GitHub Actions every 30 minutes
- Standalone TypeScript files using shared `lib/supabase.ts`
- Must be idempotent and safe to run repeatedly
- Handle errors gracefully; create sync logs
- Rate limit API calls to upstream sources

## Key Principles

1. **SEO is first-class**: Preserve stable URLs, metadata, structured data, and sitemap behavior
2. **Backend/Frontend sync**: When changing backend responses, update frontend consumers
3. **Idempotent indexers**: Safe to run repeatedly without side effects
