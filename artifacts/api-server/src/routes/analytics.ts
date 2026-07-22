import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { sql, gte } from "drizzle-orm";
import { db, imagesTable, collectionsTable } from "@workspace/db";
import { GetDailyAnalyticsQueryParams } from "@workspace/api-zod";

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

// GET /analytics/summary
router.get("/analytics/summary", requireAuth, async (req: any, res: any): Promise<void> => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [totalImages, totalCollections, totalFavorites, imagesThisWeek, imagesThisMonth, uniqueUsers] =
    await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(imagesTable),
      db.select({ count: sql<number>`count(*)` }).from(collectionsTable),
      db
        .select({ count: sql<number>`count(*)` })
        .from(imagesTable)
        .where(sql`is_favorite = true`),
      db
        .select({ count: sql<number>`count(*)` })
        .from(imagesTable)
        .where(gte(imagesTable.createdAt, weekAgo)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(imagesTable)
        .where(gte(imagesTable.createdAt, monthAgo)),
      db
        .select({ count: sql<number>`count(distinct user_id)` })
        .from(imagesTable),
    ]);

  res.json({
    totalImages: Number(totalImages[0]?.count ?? 0),
    totalUsers: Number(uniqueUsers[0]?.count ?? 0),
    totalCollections: Number(totalCollections[0]?.count ?? 0),
    totalFavorites: Number(totalFavorites[0]?.count ?? 0),
    imagesThisWeek: Number(imagesThisWeek[0]?.count ?? 0),
    imagesThisMonth: Number(imagesThisMonth[0]?.count ?? 0),
  });
});

// GET /analytics/daily
router.get("/analytics/daily", requireAuth, async (req: any, res: any): Promise<void> => {
  const parsed = GetDailyAnalyticsQueryParams.safeParse(req.query);
  const days = parsed.success ? (parsed.data.days ?? 30) : 30;

  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await db
    .select({
      date: sql<string>`to_char(date_trunc('day', created_at), 'YYYY-MM-DD')`,
      count: sql<number>`count(*)`,
    })
    .from(imagesTable)
    .where(gte(imagesTable.createdAt, since))
    .groupBy(sql`date_trunc('day', created_at)`)
    .orderBy(sql`date_trunc('day', created_at)`);

  res.json(rows.map((r) => ({ date: r.date, count: Number(r.count) })));
});

// GET /analytics/styles
router.get("/analytics/styles", requireAuth, async (req: any, res: any): Promise<void> => {
  const rows = await db
    .select({
      style: imagesTable.style,
      count: sql<number>`count(*)`,
    })
    .from(imagesTable)
    .where(sql`style is not null`)
    .groupBy(imagesTable.style)
    .orderBy(sql`count(*) desc`);

  res.json(
    rows.map((r) => ({
      style: r.style ?? "Unknown",
      count: Number(r.count),
    })),
  );
});

export default router;
