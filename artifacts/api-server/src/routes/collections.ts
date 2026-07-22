import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, and, sql, desc } from "drizzle-orm";
import { db, collectionsTable, collectionImagesTable, imagesTable } from "@workspace/db";
import {
  CreateCollectionBody,
  UpdateCollectionBody,
  UpdateCollectionParams,
  DeleteCollectionParams,
  GetCollectionParams,
  AddImageToCollectionParams,
  AddImageToCollectionBody,
  RemoveImageFromCollectionParams,
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

async function getCollectionImageCount(collectionId: number): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(collectionImagesTable)
    .where(eq(collectionImagesTable.collectionId, collectionId));
  return Number(result[0]?.count ?? 0);
}

function toCollectionResponse(
  col: typeof collectionsTable.$inferSelect,
  imageCount: number,
) {
  return {
    id: col.id,
    userId: col.userId,
    name: col.name,
    description: col.description ?? null,
    coverImageUrl: col.coverImageUrl ?? null,
    imageCount,
    createdAt: col.createdAt.toISOString(),
  };
}

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

// GET /collections
router.get("/collections", requireAuth, async (req: any, res: any): Promise<void> => {
  const cols = await db
    .select()
    .from(collectionsTable)
    .where(eq(collectionsTable.userId, req.userId))
    .orderBy(desc(collectionsTable.createdAt));

  const withCounts = await Promise.all(
    cols.map(async (col) => {
      const count = await getCollectionImageCount(col.id);
      return toCollectionResponse(col, count);
    }),
  );

  res.json(withCounts);
});

// POST /collections
router.post("/collections", requireAuth, async (req: any, res: any): Promise<void> => {
  const parsed = CreateCollectionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [col] = await db
    .insert(collectionsTable)
    .values({
      userId: req.userId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    })
    .returning();

  res.status(201).json(toCollectionResponse(col, 0));
});

// GET /collections/:id
router.get("/collections/:id", requireAuth, async (req: any, res: any): Promise<void> => {
  const params = GetCollectionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [col] = await db
    .select()
    .from(collectionsTable)
    .where(and(eq(collectionsTable.id, params.data.id), eq(collectionsTable.userId, req.userId)));

  if (!col) {
    res.status(404).json({ error: "Collection not found" });
    return;
  }

  const collectionImages = await db
    .select({ image: imagesTable })
    .from(collectionImagesTable)
    .innerJoin(imagesTable, eq(collectionImagesTable.imageId, imagesTable.id))
    .where(eq(collectionImagesTable.collectionId, col.id))
    .orderBy(desc(collectionImagesTable.addedAt));

  const images = collectionImages.map((r) => toImageResponse(r.image));

  res.json({
    id: col.id,
    userId: col.userId,
    name: col.name,
    description: col.description ?? null,
    coverImageUrl: col.coverImageUrl ?? null,
    imageCount: images.length,
    images,
    createdAt: col.createdAt.toISOString(),
  });
});

// PATCH /collections/:id
router.patch("/collections/:id", requireAuth, async (req: any, res: any): Promise<void> => {
  const params = UpdateCollectionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCollectionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Partial<typeof collectionsTable.$inferInsert> = {};
  if (parsed.data.name != null) updates.name = parsed.data.name;
  if (parsed.data.description != null) updates.description = parsed.data.description;

  const [col] = await db
    .update(collectionsTable)
    .set(updates)
    .where(and(eq(collectionsTable.id, params.data.id), eq(collectionsTable.userId, req.userId)))
    .returning();

  if (!col) {
    res.status(404).json({ error: "Collection not found" });
    return;
  }

  const count = await getCollectionImageCount(col.id);
  res.json(toCollectionResponse(col, count));
});

// DELETE /collections/:id
router.delete("/collections/:id", requireAuth, async (req: any, res: any): Promise<void> => {
  const params = DeleteCollectionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [col] = await db
    .delete(collectionsTable)
    .where(and(eq(collectionsTable.id, params.data.id), eq(collectionsTable.userId, req.userId)))
    .returning();

  if (!col) {
    res.status(404).json({ error: "Collection not found" });
    return;
  }

  res.sendStatus(204);
});

// POST /collections/:id/images
router.post("/collections/:id/images", requireAuth, async (req: any, res: any): Promise<void> => {
  const params = AddImageToCollectionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = AddImageToCollectionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [col] = await db
    .select()
    .from(collectionsTable)
    .where(and(eq(collectionsTable.id, params.data.id), eq(collectionsTable.userId, req.userId)));

  if (!col) {
    res.status(404).json({ error: "Collection not found" });
    return;
  }

  // Check image exists and belongs to user
  const [image] = await db
    .select()
    .from(imagesTable)
    .where(and(eq(imagesTable.id, parsed.data.imageId), eq(imagesTable.userId, req.userId)));

  if (!image) {
    res.status(404).json({ error: "Image not found" });
    return;
  }

  // Upsert to avoid duplicates
  await db
    .insert(collectionImagesTable)
    .values({ collectionId: col.id, imageId: image.id })
    .onConflictDoNothing();

  // Update cover if none set
  if (!col.coverImageUrl) {
    await db
      .update(collectionsTable)
      .set({ coverImageUrl: image.imageUrl })
      .where(eq(collectionsTable.id, col.id));
  }

  const count = await getCollectionImageCount(col.id);
  const updatedCol = (
    await db.select().from(collectionsTable).where(eq(collectionsTable.id, col.id))
  )[0];
  res.json(toCollectionResponse(updatedCol, count));
});

// DELETE /collections/:id/images/:imageId
router.delete(
  "/collections/:id/images/:imageId",
  requireAuth,
  async (req: any, res: any): Promise<void> => {
    const params = RemoveImageFromCollectionParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [col] = await db
      .select()
      .from(collectionsTable)
      .where(and(eq(collectionsTable.id, params.data.id), eq(collectionsTable.userId, req.userId)));

    if (!col) {
      res.status(404).json({ error: "Collection not found" });
      return;
    }

    await db
      .delete(collectionImagesTable)
      .where(
        and(
          eq(collectionImagesTable.collectionId, params.data.id),
          eq(collectionImagesTable.imageId, params.data.imageId),
        ),
      );

    res.sendStatus(204);
  },
);

export default router;
