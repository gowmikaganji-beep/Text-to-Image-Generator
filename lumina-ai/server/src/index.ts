import "dotenv/config";
import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { requireAuth } from "./middleware/auth.js";
import { imagesRouter } from "./routes/images.js";
import { collectionsRouter } from "./routes/collections.js";

const hasPlaceholderClerkKey = (value?: string) => {
  if (!value) return true;
  return value.includes("xxxxxxxx") || value.includes("your_") || value.includes("example");
};

const shouldUseClerk =
  process.env.NODE_ENV === "production"
    ? Boolean(process.env.CLERK_SECRET_KEY && process.env.CLERK_PUBLISHABLE_KEY)
    : !hasPlaceholderClerkKey(process.env.CLERK_SECRET_KEY) && !hasPlaceholderClerkKey(process.env.CLERK_PUBLISHABLE_KEY);

const app = express();

// Permissive CORS for local development across port shifts (5173, 5174, etc.)
app.use(
  cors({
    origin: (_origin, callback) => callback(null, true),
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "x-user-id", "x-user-email", "x-guest-id"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

// Generous body limit since generated images come back as base64 data URLs.
app.use(express.json({ limit: "15mb" }));

// Mount Clerk middleware without handshake redirect loops for API endpoints
if (shouldUseClerk) {
  app.use(clerkMiddleware({ enableHandshake: false }));
} else {
  app.use((_req, _res, next) => next());
  console.log("Clerk middleware disabled for local dev mode; using fallback auth.");
}

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/images", requireAuth, imagesRouter);
app.use("/api/collections", requireAuth, collectionsRouter);

// Centralized error handler as a final safety net.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

const port = Number(process.env.PORT) || 8080;
app.listen(port, () => {
  console.log(`Lumina API listening on http://localhost:${port}`);
});
