import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

export const collectionsRouter = Router();

const nameSchema = z.object({ name: z.string().min(1).max(120) });

// GET /api/collections — list collections with image count + a cover thumbnail
collectionsRouter.get("/", async (req, res) => {
  const collections = await prisma.collection.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: "desc" },
    include: {
      images: {
        take: 4,
        orderBy: { addedAt: "desc" },
        include: { image: true },
      },
      _count: { select: { images: true } },
    },
  });
  res.json(collections);
});

// POST /api/collections — create a new collection
collectionsRouter.post("/", async (req, res) => {
  const parsed = nameSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid name" });

  const collection = await prisma.collection.create({
    data: { name: parsed.data.name, userId: req.userId! },
  });
  res.status(201).json(collection);
});

// GET /api/collections/:id — collection detail with all images
collectionsRouter.get("/:id", async (req, res) => {
  const collection = await prisma.collection.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    include: { images: { include: { image: true }, orderBy: { addedAt: "desc" } } },
  });
  if (!collection) return res.status(404).json({ error: "Collection not found" });
  res.json(collection);
});

// PATCH /api/collections/:id — rename
collectionsRouter.patch("/:id", async (req, res) => {
  const parsed = nameSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid name" });

  const collection = await prisma.collection.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!collection) return res.status(404).json({ error: "Collection not found" });

  const updated = await prisma.collection.update({
    where: { id: collection.id },
    data: { name: parsed.data.name },
  });
  res.json(updated);
});

// DELETE /api/collections/:id
collectionsRouter.delete("/:id", async (req, res) => {
  const collection = await prisma.collection.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!collection) return res.status(404).json({ error: "Collection not found" });

  await prisma.collection.delete({ where: { id: collection.id } });
  res.status(204).send();
});

// POST /api/collections/:id/images — { imageId } add an image to a collection
collectionsRouter.post("/:id/images", async (req, res) => {
  const imageId = req.body?.imageId as string | undefined;
  if (!imageId) return res.status(400).json({ error: "imageId is required" });

  const [collection, image] = await Promise.all([
    prisma.collection.findFirst({ where: { id: req.params.id, userId: req.userId! } }),
    prisma.image.findFirst({ where: { id: imageId, userId: req.userId! } }),
  ]);
  if (!collection) return res.status(404).json({ error: "Collection not found" });
  if (!image) return res.status(404).json({ error: "Image not found" });

  const link = await prisma.collectionImage.upsert({
    where: { collectionId_imageId: { collectionId: collection.id, imageId: image.id } },
    update: {},
    create: { collectionId: collection.id, imageId: image.id },
  });
  res.status(201).json(link);
});

// DELETE /api/collections/:id/images/:imageId — remove image from collection
collectionsRouter.delete("/:id/images/:imageId", async (req, res) => {
  const collection = await prisma.collection.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!collection) return res.status(404).json({ error: "Collection not found" });

  await prisma.collectionImage.deleteMany({
    where: { collectionId: collection.id, imageId: req.params.imageId },
  });
  res.status(204).send();
});
