# Lumina — AI Text-to-Image Generator

A premium AI-powered image generation studio built with React, Express, PostgreSQL (NeonDB), OpenAI gpt-image-1, and Clerk auth.

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui + Framer Motion
- **Backend**: Node.js + Express 5
- **Database**: PostgreSQL (NeonDB) + Drizzle ORM
- **Auth**: Clerk (email/password + Google OAuth)
- **AI**: OpenAI gpt-image-1 image generation
- **Package manager**: pnpm workspaces

## Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- A [NeonDB](https://neon.tech) PostgreSQL database
- An [OpenAI](https://platform.openai.com) API key
- A [Clerk](https://clerk.com) account and app

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required values:
- `DATABASE_URL` — your NeonDB connection string
- `OPENAI_API_KEY` — your OpenAI API key (needs Images API access)
- `CLERK_SECRET_KEY` — from Clerk dashboard → API Keys
- `CLERK_PUBLISHABLE_KEY` — from Clerk dashboard → API Keys
- `VITE_CLERK_PUBLISHABLE_KEY` — same as `CLERK_PUBLISHABLE_KEY`

### 3. Push the database schema

```bash
pnpm --filter @workspace/db run push
```

This creates the tables: `images`, `collections`, `collection_images`.

### 4. Run the development servers

In one terminal — API server:
```bash
PORT=8080 BASE_PATH=/api pnpm --filter @workspace/api-server run dev
```

In another terminal — Frontend:
```bash
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/image-gen run dev
```

Then open http://localhost:5173

## Project Structure

```
├── artifacts/
│   ├── api-server/          # Express backend
│   │   └── src/
│   │       ├── app.ts       # Express app setup + Clerk middleware
│   │       ├── routes/
│   │       │   ├── images.ts       # Generate, list, CRUD, favorites, variations
│   │       │   ├── collections.ts  # Collection management
│   │       │   └── analytics.ts    # Admin analytics
│   │       └── middlewares/
│   │           └── clerkProxyMiddleware.ts
│   └── image-gen/           # React frontend
│       └── src/
│           ├── App.tsx       # Root with Clerk + Wouter routing
│           ├── pages/        # Home, Generate, History, Collections, Admin
│           └── components/   # ImageCard, CollectionCard, Sidebar, etc.
├── lib/
│   ├── api-spec/
│   │   └── openapi.yaml     # OpenAPI spec (source of truth)
│   ├── api-client-react/    # Generated React Query hooks
│   ├── api-zod/             # Generated Zod validation schemas
│   └── db/
│       └── src/schema/      # Drizzle ORM table definitions
└── pnpm-workspace.yaml
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/generate | Generate image from prompt |
| GET | /api/images | List images (with filters) |
| GET | /api/images/recent | Recent images for dashboard |
| GET | /api/images/:id | Get single image |
| PATCH | /api/images/:id | Update image title/prompt |
| DELETE | /api/images/:id | Delete image |
| PATCH | /api/images/:id/favorite | Toggle favorite |
| POST | /api/images/:id/variations | Create variation |
| GET | /api/collections | List collections |
| POST | /api/collections | Create collection |
| GET | /api/collections/:id | Get collection with images |
| PATCH | /api/collections/:id | Update collection |
| DELETE | /api/collections/:id | Delete collection |
| POST | /api/collections/:id/images | Add image to collection |
| DELETE | /api/collections/:id/images/:imageId | Remove image from collection |
| GET | /api/analytics/summary | Admin summary stats |
| GET | /api/analytics/daily | Daily generation counts |
| GET | /api/analytics/styles | Style breakdown stats |

## Regenerate API types (after spec changes)

```bash
pnpm --filter @workspace/api-spec run codegen
```

## Notes

- Images are stored as base64 data URLs in the database. For production with high volume, upload to S3/Cloudinary and store the URL instead.
- The Clerk proxy middleware in Express handles OAuth callbacks — keep it mounted before body parsers.
- `gpt-image-1` does not accept a `response_format` parameter — it always returns base64.
