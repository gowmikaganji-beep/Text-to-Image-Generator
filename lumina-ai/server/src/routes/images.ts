import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { generateImage, generateVariation } from "../services/openai.js";

export const imagesRouter = Router();

const generateSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(2000),
  size: z.enum(["1024x1024", "1024x1536", "1536x1024", "auto"]).optional(),
  quality: z.enum(["low", "medium", "high", "auto"]).optional(),
});

// POST /api/images/generate — the core feature: prompt in, image out.
imagesRouter.post("/generate", async (req, res) => {
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request" });
  }
  const { prompt, size, quality } = parsed.data;

  try {
    const [url] = await generateImage({ prompt, size, quality });

    const image = await prisma.image.create({
      data: {
        prompt,
        url,
        userId: req.userId!,
      },
    });

    res.status(201).json(image);
  } catch (err) {
    console.error("Generation error:", err);
    res.status(502).json({ error: "Image generation failed. Please try again." });
  }
});

// POST /api/images/:id/variations — generate a variation of an existing image.
imagesRouter.post("/:id/variations", async (req, res) => {
  const parent = await prisma.image.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!parent) return res.status(404).json({ error: "Image not found" });

  try {
    const [url] = await generateVariation(parent.prompt);
    const variation = await prisma.image.create({
      data: {
        prompt: parent.prompt,
        url,
        userId: req.userId!,
        parentId: parent.id,
      },
    });
    res.status(201).json(variation);
  } catch (err) {
    console.error("Variation error:", err);
    res.status(502).json({ error: "Variation generation failed. Please try again." });
  }
});

// GET /api/images — full history, newest first. Supports ?favorite=true and ?q=search
imagesRouter.get("/", async (req, res) => {
  const favoriteOnly = req.query.favorite === "true";
  const q = typeof req.query.q === "string" ? req.query.q : undefined;

  const images = await prisma.image.findMany({
    where: {
      userId: req.userId!,
      ...(favoriteOnly ? { isFavorite: true } : {}),
      ...(q ? { prompt: { contains: q } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { variations: true },
  });

  res.json(images);
});

// GET /api/images/:id
imagesRouter.get("/:id", async (req, res) => {
  const image = await prisma.image.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    include: { variations: true, collections: { include: { collection: true } } },
  });
  if (!image) return res.status(404).json({ error: "Image not found" });
  res.json(image);
});

// PATCH /api/images/:id/favorite — toggle favorite
imagesRouter.patch("/:id/favorite", async (req, res) => {
  const image = await prisma.image.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!image) return res.status(404).json({ error: "Image not found" });

  const updated = await prisma.image.update({
    where: { id: image.id },
    data: { isFavorite: !image.isFavorite },
  });
  res.json(updated);
});

// DELETE /api/images/:id
imagesRouter.delete("/:id", async (req, res) => {
  const image = await prisma.image.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!image) return res.status(404).json({ error: "Image not found" });

  await prisma.image.delete({ where: { id: image.id } });
  res.status(204).send();
});
