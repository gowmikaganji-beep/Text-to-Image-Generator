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
import OpenAI from "openai";

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

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
  return new OpenAI({ apiKey });
}

// POST /generate
router.post("/generate", requireAuth, async (req: any, res: any): Promise<void> => {
  const parsed = GenerateImageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { prompt, negativePrompt, style, size, quality } = parsed.data;
  const openai = getOpenAI();

  const start = Date.now();
  try {
    // Build enriched prompt with style
    const stylePrompt = style
      ? `${prompt}. Style: ${style} art style.`
      : prompt;

    // dall-e-3 supports 1024x1024, 1792x1024, 1024x1792
    const sizeMap: Record<string, "1024x1024" | "1792x1024" | "1024x1792"> = {
      "1024x1024": "1024x1024",
      "1536x1024": "1792x1024",
      "1024x1536": "1024x1792",
    };
    const imageSize = sizeMap[size ?? "1024x1024"] ?? "1024x1024";

    // dall-e-3 uses "standard" or "hd"
    const imageQuality = quality === "high" ? "hd" : "standard";

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: stylePrompt,
      size: imageSize,
      quality: imageQuality,
      response_format: "b64_json",
      n: 1,
    });

    const generationTimeMs = Date.now() - start;
    const b64 = response.data?.[0]?.b64_json;
    if (!b64) {
      res.status(500).json({ error: "No image data returned from API" });
      return;
    }

    const imageUrl = `data:image/png;base64,${b64}`;

    const [image] = await db
      .insert(imagesTable)
      .values({
        userId: req.userId,
        prompt,
        negativePrompt: negativePrompt ?? null,
        imageUrl,
        size: imageSize,
        style: style ?? null,
        quality: quality ?? "standard",
        isFavorite: false,
        generationTimeMs,
      })
      .returning();

    res.status(201).json({
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
    });
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

  const openai = getOpenAI();
  const variationPrompt = parsed.data.prompt ?? original.prompt;
  const variationStyle = parsed.data.style ?? original.style ?? undefined;
  const stylePrompt = variationStyle
    ? `${variationPrompt}. Style: ${variationStyle} art style.`
    : variationPrompt;

  const start = Date.now();
  try {
    const sizeMap: Record<string, "1024x1024" | "1792x1024" | "1024x1792"> = {
      "1024x1024": "1024x1024",
      "1536x1024": "1792x1024",
      "1024x1536": "1024x1792",
    };
    const imageSize = sizeMap[original.size ?? "1024x1024"] ?? "1024x1024";
    const imageQuality = original.quality === "high" ? "hd" : "standard";

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: stylePrompt,
      size: imageSize,
      quality: imageQuality,
      response_format: "b64_json",
      n: 1,
    });

    const generationTimeMs = Date.now() - start;
    const b64 = response.data?.[0]?.b64_json;
    if (!b64) {
      res.status(500).json({ error: "No image data returned from API" });
      return;
    }

    const imageUrl = `data:image/png;base64,${b64}`;

    const [image] = await db
      .insert(imagesTable)
      .values({
        userId: req.userId,
        prompt: variationPrompt,
        imageUrl,
        size: imageSize,
        style: variationStyle ?? null,
        quality: original.quality ?? "standard",
        isFavorite: false,
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
