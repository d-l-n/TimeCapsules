# AGENTS.md — Time Capsules

## Project Overview

Personal TV show & movie tracking history dashboard. Enriched with TMDB metadata and IMDb ratings.

- **Stack:** React 19 + TypeScript 6 + Vite 8 + Tailwind CSS v4 + Firebase (Auth + Firestore)
- **Hosting:** Cloudflare Pages
- **Auth:** Google OAuth + Email/Password + Guest mode
- **Design:** Monochrome brutalism (#f5f0eb bg, #0a0a0a text, #ccff00 accent, #ff2d78 highlight)

## Agent Roles

### Orchestrator (PM)
- Breaks work into tasks, assigns to agents, tracks progress
- Updates BACKLOG.md with completed/pending items
- Ensures AGENTS.md is kept current

### Developer
- Writes production code following existing conventions
- Creates custom hooks in `src/hooks/` for reusable logic
- Keeps pages thin — queries belong in hooks/services, not JSX
- Runs `npx tsc -b` and `npx oxlint` before submitting

### QA / Testing
- Runs `npm run qa:validate` for data integrity
- Verifies queries work with Firestore indexes
- Checks that filtering by `user_id` is applied on all user-specific queries

## Project Structure

```
src/
  hooks/          — Custom React hooks (useFollowedShows, useHistory, useStats)
  lib/            — Firebase init, AuthContext, type definitions
  services/       — External API clients (tmdb.ts)
  pages/          — Route-level page components
  components/     — Shared UI components (Layout, ShowCard)
  main.tsx        — Entry point
  App.tsx         — Router + ProtectedRoute
  index.css       — Tailwind + theme tokens
scripts/          — Data pipeline (import, enrich, merge, validate, migrate)
public/
  _redirects      — SPA fallback for Cloudflare
  _headers        — Security and caching headers
```

## Code Conventions

- No comments in production code
- `user_id` in Firestore documents is the Firebase Auth UID string
- All user-scoped queries must filter by `where('user_id', '==', auth.uid)`
- Use `import.meta.env.VITE_*` for public env vars, `process.env.*` for Node scripts
- Barrel exports from `src/hooks/index.ts`

## Data Collections (Firestore)

| Collection | Key fields | User-scoped |
|---|---|---|
| `shows` | tmdb_id (doc ID), name, poster_url, imdb_id, media_type | No |
| `episodes` | tmdb_id (doc ID), show_id, season_number, episode_number | No |
| `followed_shows` | user_id, show_id, active, followed_at | Yes |
| `watched_episodes` | user_id, episode_id, show_id, watched_at | Yes |
| `ratings` | user_id, show_id, rating | Yes |
| `badges` | user_id, badge_id, earned_at | Yes |
| `episode_emotions` | user_id, episode_id, emotion_id | Yes |
| `user_stats` | user_id, time_spent, nb_episodes_watched | Yes |

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | TypeScript check + Vite build |
| `npm run lint` | Run oxlint |
| `npm run pages:deploy` | Build + deploy to Cloudflare Pages |
| `npm run merge:imdb` | Merge IMDb ratings |
| `npm run qa:validate` | Validate data integrity |
| `npm run reset` | Delete all collections (full reset) |
| `npm run delete:anonymous` | Delete anonymous Firebase Auth users |

## Design Context

Design strategy documented in `PRODUCT.md` (register, purpose, brand personality, anti-references, design principles). Visual system in `DESIGN.md` (colors, typography, elevation, components, do's/don'ts). Agents generating new UI must read both files first to stay on-brand.

## Memanto

This project has persistent memory via [Memanto](https://memanto.ai). The AI agent can remember decisions, preferences, and context across sessions.

- **Agent name:** TimeCapsules
- **Commands:** `memanto remember`, `memanto recall`, `memanto answer`, `memanto status`
- **Activate:** `memanto agent activate TimeCapsules`
- **Skill auto-loaded from:** `.opencode/skills/memanto.md`
