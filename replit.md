# Lumina — AI Text-to-Image Generator

A premium AI-powered image generation studio where users create stunning images from text prompts, curate them into collections, and explore their creative history.

## Run & Operate

- `pnpm --filter @workspace/image-gen run dev` — run the frontend (port auto-assigned)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned)
- Required env: `OPENAI_API_KEY` — user's own OpenAI API key (for gpt-image-1 image generation)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS v4 + shadcn/ui + Framer Motion
- Auth: Clerk (Replit-managed, `@clerk/react` + `@clerk/express`)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (tables: `images`, `collections`, `collection_images`)
- AI: OpenAI `gpt-image-1` via user-provided `OPENAI_API_KEY`
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for API contracts
- `lib/db/src/schema/images.ts` — images table (prompts, results, favorites)
- `lib/db/src/schema/collections.ts` — collections + collection_images join table
- `artifacts/api-server/src/routes/images.ts` — generate, list, CRUD, favorites, variations
- `artifacts/api-server/src/routes/collections.ts` — collection CRUD + image membership
- `artifacts/api-server/src/routes/analytics.ts` — admin summary, daily stats, style breakdown
- `artifacts/image-gen/src/App.tsx` — main app with Clerk + Wouter routing
- `artifacts/image-gen/src/pages/` — all pages (home, generate, history, collections, admin)
- `artifacts/image-gen/src/components/` — shared components (image-card, collection-card, layout/sidebar)

## Architecture decisions

- Images stored as base64 data URLs in the DB (no object storage required for dev). For production, upload to S3/Cloudinary and store URL only.
- Auth is cookie-based for web (Clerk session cookies). No manual token handling needed on the frontend.
- OpenAI gpt-image-1 always returns base64; response_format param is not supported.
- Supported image sizes: 1024×1024, 1536×1024 (landscape), 1024×1536 (portrait).
- Clerk proxy middleware must mount before Express body parsers (streams raw bytes).

## Product

- **Generate**: Prompt + negative prompt + 10 style presets + size/quality/seed controls → AI image generation via OpenAI gpt-image-1
- **History**: Paginated grid with search, date range, style, and favorites filters
- **Collections**: Create and manage named collections; move images between them
- **Admin**: Analytics dashboard with daily generation chart and style breakdown
- **Auth**: Email/password + Google OAuth via Replit-managed Clerk

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After any schema change in `lib/db/src/schema/`, run `pnpm run typecheck:libs` before typechecking artifact packages — stale lib declarations cause false TS2305 errors.
- Clerk Proxy middleware (`CLERK_PROXY_PATH`) must be mounted BEFORE `express.json()` in app.ts.
- Do not use `response_format` with gpt-image-1 — it always returns base64 and the param throws an error.
- When using `@workspace/api-client-react` types, import from the package root — not from internal paths like `/src/generated/api.schemas`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See `.local/skills/clerk-auth/references/setup-and-customization.md` for Clerk customization
