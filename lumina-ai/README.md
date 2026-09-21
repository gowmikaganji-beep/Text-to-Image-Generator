# Lumina — AI Text-to-Image Generator

Full-stack app that turns a text prompt into an image using OpenAI's `gpt-image-1`, with
history, collections, favorites, and variations. Auth via Clerk, data in a local SQLite database (Prisma).

```
lumina-ai/
├── server/     Express + TypeScript API (Clerk auth, Prisma/PostgreSQL, OpenAI)
└── client/     React + TypeScript + Vite + Tailwind + Framer Motion
```

## 1. Prerequisites

- Node.js 18+
- A Clerk account (https://clerk.com) → create an application, grab the API keys
- An OpenAI API key with access to `gpt-image-1` (https://platform.openai.com). Note: OpenAI
  requires **Organization Verification** in your developer console before your org can call
  the GPT Image models — if generation fails with a permissions error, this is almost always why.

## 2. Backend setup

```bash
cd server
cp .env.example .env
# fill in CLERK_SECRET_KEY and OPENAI_API_KEY
npm install
npx prisma migrate dev --name init
npm run dev        # http://localhost:8080
```

## 3. Frontend setup

```bash
cd client
cp .env.example .env
# fill in VITE_CLERK_PUBLISHABLE_KEY and VITE_API_URL (default http://localhost:8080)
npm install
npm run dev         # http://localhost:5173
```

## 4. How it works

1. User signs in with Clerk on the frontend.
2. Every API request carries the Clerk session JWT in `Authorization: Bearer <token>`.
3. The Express backend verifies the token with `@clerk/backend`, upserts a local `User`
   row keyed by `clerkId`, and scopes all data (images, collections, favorites) to that user.
4. `POST /api/images/generate` calls OpenAI `images.generate` with model `gpt-image-1`,
   stores the returned base64 image (decoded to a data URL, or uploaded to storage if you
   wire one up — see `server/src/services/openai.ts`), and persists a row with the prompt.
5. The gallery, favorites, collections, and variations screens all read/write through the
   same `Image` table via normal CRUD routes.

## 5. Verification notes (from re-reviewing this codebase)

- Auth is implemented with `@clerk/express`'s `clerkMiddleware()` + `getAuth(req)`, mounted
  globally in `index.ts`, which is Clerk's current recommended pattern for Express — not a
  hand-rolled call into the lower-level `@clerk/backend` package. This matters because an
  earlier draft of this code checked a field name (`isSignedIn`) that doesn't exist on
  Clerk's response — `isAuthenticated` is correct — and would have silently 401'd every
  request even with valid keys.
- `gpt-image-1` always returns base64 (`b64_json`), never a `url` — the code accounts for
  this and never requests `response_format`.
- Validation errors from the API now return a plain string in `error`, matching what the
  frontend's error handler expects.

## 6. Deployment notes

- Backend: any Node host (Render, Railway, Fly.io). Set the same env vars.
- Frontend: Vercel/Netlify. Set `VITE_API_URL` to your deployed backend URL.
- Swap the in-memory base64 image storage in `openai.ts` for S3/R2/Cloudinary for production
  (base64 in Postgres works for a demo but isn't ideal at scale — the TODO is marked inline).
