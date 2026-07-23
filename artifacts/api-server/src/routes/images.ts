import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, desc, ilike, and, gte, lte, sql } from "drizzle-orm";
import { db, imagesTable } from "@workspace/db";
import {
  GenerateImageBody,
  UpdateImageBody,
  UpdateImageParams,
  DeleteImageParams,
  GetImageParams,
  ToggleFavoriteParams,
  CreateVariationParams,
  CreateVariationBody,
  ListImagesQueryParams,
  ListRecentImagesQueryParams,
} from "@workspace/api-zod";
const router: IRouter = Router();

function requireAuth(req: any, res: any, next: any): void {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  next();
}

// Map style preset → best Pollinations model
const STYLE_MODEL_MAP: Record<string, string> = {
  "Realistic":    "flux-realism",
  "Anime":        "flux-anime",
  "Digital Art":  "flux",
  "Oil Painting": "flux",
  "Watercolor":   "flux",
  "Pixel Art":    "flux",
  "Cinematic":    "flux-realism",
  "Fantasy":      "flux",
  "Cyberpunk":    "any-dark",
  "Minimal":      "flux",
};

/**
 * Generate an image via Pollinations.AI — 100% free, no API key required.
 * Returns a base64 data URL string.
 */
async function generateWithPollinations(opts: {
  prompt: string;
  negativePrompt?: string | null;
  style?: string | null;
  width: number;
  height: number;
  seed?: number | null;
  enhance?: boolean;
}): Promise<string> {
  const { prompt, negativePrompt, style, width, height, seed, enhance } = opts;

  // Enrich the prompt with style wording so the model understands it
  const fullPrompt = style ? `${prompt}, ${style} style` : prompt;
  const model = (style && STYLE_MODEL_MAP[style]) ?? "flux";

  const params = new URLSearchParams({
    width:  String(width),
    height: String(height),
    model,
    nologo: "true",
    ...(seed          ? { seed: String(seed) }         : {}),
    ...(negativePrompt ? { negative: negativePrompt }  : {}),
    ...(enhance        ? { enhance: "true" }            : {}),
  });

  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?${params}`;

  // Give Pollinations up to 120 s — complex prompts can take a while
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Pollinations API returned ${res.status} ${res.statusText}`);
    }
    const buffer = await res.arrayBuffer();
    const b64 = Buffer.from(buffer).toString("base64");
    const mime = res.headers.get("content-type") ?? "image/jpeg";
    return `data:${mime};base64,${b64}`;
  } finally {
    clearTimeout(timeout);
  }
}

function parseDimensions(size: string): { width: number; height: number } {
  const [w, h] = size.split("x").map(Number);
  return { width: w || 1024, height: h || 1024 };
}

// POST /generate
router.post("/generate", requireAuth, async (req: any, res: any): Promise<void> => {
  const parsed = GenerateImageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { prompt, negativePrompt, style, size, quality, seed } = parsed.data;
  const { width, height } = parseDimensions(size ?? "1024x1024");

  const start = Date.now();
  try {
    const imageUrl = await generateWithPollinations({
      prompt,
      negativePrompt,
      style,
      width,
      height,
      seed,
      enhance: quality === "high",
    });

    const generationTimeMs = Date.now() - start;

    const [image] = await db
      .insert(imagesTable)
      .values({
        userId:          req.userId,
        prompt,
        negativePrompt:  negativePrompt ?? null,
        imageUrl,
        size:            size ?? "1024x1024",
        style:           style ?? null,
        quality:         quality ?? "standard",
        seed:            seed ?? null,
        isFavorite:      false,
        generationTimeMs,
      })
      .returning();

    res.status(201).json(toImageResponse(image));
  } catch (err: any) {
    req.log.error({ err }, "Image generation failed");
    res.status(500).json({ error: err.message ?? "Image generation failed" });
  }
});

// GET /images
router.get("/images", requireAuth, async (req: any, res: any): Promise<void> => {
  const parsed = ListImagesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { page = 1, limit = 20, search, style, favorite, startDate, endDate } = parsed.data;
  const offset = (page - 1) * limit;

  const conditions: any[] = [eq(imagesTable.userId, req.userId)];
  if (search) conditions.push(ilike(imagesTable.prompt, `%${search}%`));
  if (style) conditions.push(eq(imagesTable.style, style));
  if (favorite === true) conditions.push(eq(imagesTable.isFavorite, true));
  if (startDate) conditions.push(gte(imagesTable.createdAt, new Date(startDate)));
  if (endDate) conditions.push(lte(imagesTable.createdAt, new Date(endDate)));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [images, countResult] = await Promise.all([
    db
      .select()
      .from(imagesTable)
      .where(where)
      .orderBy(desc(imagesTable.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(imagesTable)
      .where(where),
  ]);

  const total = Number(countResult[0]?.count ?? 0);

  res.json({
    images: images.map(toImageResponse),
    total,
    page,
    limit,
  });
});

// GET /images/recent
router.get("/images/recent", requireAuth, async (req: any, res: any): Promise<void> => {
  const parsed = ListRecentImagesQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 8) : 8;

  const images = await db
    .select()
    .from(imagesTable)
    .where(eq(imagesTable.userId, req.userId))
    .orderBy(desc(imagesTable.createdAt))
    .limit(limit);

  res.json(images.map(toImageResponse));
});

// GET /images/:id
router.get("/images/:id", requireAuth, async (req: any, res: any): Promise<void> => {
  const params = GetImageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [image] = await db
    .select()
    .from(imagesTable)
    .where(and(eq(imagesTable.id, params.data.id), eq(imagesTable.userId, req.userId)));

  if (!image) {
    res.status(404).json({ error: "Image not found" });
    return;
  }

  res.json(toImageResponse(image));
});

// PATCH /images/:id
router.patch("/images/:id", requireAuth, async (req: any, res: any): Promise<void> => {
  const params = UpdateImageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateImageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Partial<typeof imagesTable.$inferInsert> = {};
  if (parsed.data.prompt != null) updates.prompt = parsed.data.prompt;
  if (parsed.data.title != null) updates.title = parsed.data.title;

  const [image] = await db
    .update(imagesTable)
    .set(updates)
    .where(and(eq(imagesTable.id, params.data.id), eq(imagesTable.userId, req.userId)))
    .returning();

  if (!image) {
    res.status(404).json({ error: "Image not found" });
    return;
  }

  res.json(toImageResponse(image));
});

// DELETE /images/:id
router.delete("/images/:id", requireAuth, async (req: any, res: any): Promise<void> => {
  const params = DeleteImageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [image] = await db
    .delete(imagesTable)
    .where(and(eq(imagesTable.id, params.data.id), eq(imagesTable.userId, req.userId)))
    .returning();

  if (!image) {
    res.status(404).json({ error: "Image not found" });
    return;
  }

  res.sendStatus(204);
});

// PATCH /images/:id/favorite
router.patch("/images/:id/favorite", requireAuth, async (req: any, res: any): Promise<void> => {
  const params = ToggleFavoriteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(imagesTable)
    .where(and(eq(imagesTable.id, params.data.id), eq(imagesTable.userId, req.userId)));

  if (!existing) {
    res.status(404).json({ error: "Image not found" });
    return;
  }

  const [image] = await db
    .update(imagesTable)
    .set({ isFavorite: !existing.isFavorite })
    .where(eq(imagesTable.id, params.data.id))
    .returning();

  res.json(toImageResponse(image));
});

// POST /images/:id/variations
router.post("/images/:id/variations", requireAuth, async (req: any, res: any): Promise<void> => {
  const params = CreateVariationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateVariationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [original] = await db
    .select()
    .from(imagesTable)
    .where(and(eq(imagesTable.id, params.data.id), eq(imagesTable.userId, req.userId)));

  if (!original) {
    res.status(404).json({ error: "Image not found" });
    return;
  }

  const variationPrompt = parsed.data.prompt ?? original.prompt;
  const variationStyle = parsed.data.style ?? original.style ?? null;
  const { width, height } = parseDimensions(original.size ?? "1024x1024");

  const start = Date.now();
  try {
    const imageUrl = await generateWithPollinations({
      prompt: variationPrompt,
      style: variationStyle,
      width,
      height,
      enhance: original.quality === "high",
    });

    const generationTimeMs = Date.now() - start;

    const [image] = await db
      .insert(imagesTable)
      .values({
        userId:          req.userId,
        prompt:          variationPrompt,
        imageUrl,
        size:            original.size ?? "1024x1024",
        style:           variationStyle,
        quality:         original.quality ?? "standard",
        isFavorite:      false,
        generationTimeMs,
      })
      .returning();

    res.status(201).json(toImageResponse(image));
  } catch (err: any) {
    req.log.error({ err }, "Variation generation failed");
    res.status(500).json({ error: err.message ?? "Variation generation failed" });
  }
});

function toImageResponse(image: typeof imagesTable.$inferSelect) {
  return {
    id: image.id,
    userId: image.userId,
    prompt: image.prompt,
    negativePrompt: image.negativePrompt ?? null,
    title: image.title ?? null,
    imageUrl: image.imageUrl,
    size: image.size,
    style: image.style ?? null,
    quality: image.quality ?? null,
    seed: image.seed ?? null,
    isFavorite: image.isFavorite,
    generationTimeMs: image.generationTimeMs,
    createdAt: image.createdAt.toISOString(),
  };
}

export default router;
