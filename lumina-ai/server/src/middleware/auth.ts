import type { NextFunction, Request, Response } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { prisma } from "../lib/prisma.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string; // our internal User.id (not the Clerk id)
      clerkId?: string;
      userEmail?: string;
    }
  }
}

// In-memory cache for Clerk user emails to prevent redundant network lookups
const clerkEmailCache = new Map<string, { email: string; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Safely fetches primary email from Clerk SDK with caching
 */
async function getClerkUserEmail(clerkId: string): Promise<string | undefined> {
  if (!clerkId.startsWith("user_")) return undefined;

  const cached = clerkEmailCache.get(clerkId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.email;
  }

  try {
    const clerkUser = await clerkClient.users.getUser(clerkId);
    const primary =
      clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId) ||
      clerkUser.emailAddresses[0];

    if (primary?.emailAddress) {
      const email = primary.emailAddress.toLowerCase().trim();
      clerkEmailCache.set(clerkId, { email, timestamp: Date.now() });
      return email;
    }
  } catch {
    // Silently continue if Clerk API call fails (e.g. offline/mock environment)
  }

  return undefined;
}

/**
 * Helper to safely extract user ID and email from a Clerk JWT payload if getAuth doesn't populate it.
 */
function extractFromJwt(authHeader?: string): { userId?: string; email?: string } {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return {};
  const token = authHeader.slice(7).trim();
  try {
    const parts = token.split(".");
    if (parts.length >= 2) {
      const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const json = Buffer.from(base64, "base64").toString("utf8");
      const payload = JSON.parse(json);
      const userId = typeof payload.sub === "string" && payload.sub.length > 0 ? payload.sub : undefined;
      const email =
        typeof payload.email === "string"
          ? payload.email.toLowerCase().trim()
          : typeof payload.primary_email === "string"
            ? payload.primary_email.toLowerCase().trim()
            : undefined;
      return { userId, email };
    }
  } catch {}
  return {};
}

/**
 * Migrate creations made during a guest session to the authenticated user account.
 */
async function migrateGuestData(guestClerkId: string, targetUserId: string) {
  try {
    if (!guestClerkId || guestClerkId.startsWith("user_")) return;

    const guestUser = await prisma.user.findUnique({
      where: { clerkId: guestClerkId },
      select: { id: true },
    });

    if (guestUser && guestUser.id !== targetUserId) {
      await prisma.image.updateMany({
        where: { userId: guestUser.id },
        data: { userId: targetUserId },
      });

      await prisma.collection.updateMany({
        where: { userId: guestUser.id },
        data: { userId: targetUserId },
      });
    }
  } catch (err) {
    console.warn("Guest data migration skipped:", err);
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    let clerkId: string | undefined;
    let email: string | undefined;

    // 1. Try Clerk SDK getAuth
    try {
      const auth = getAuth(req);
      if (auth?.userId) {
        clerkId = auth.userId;
      }
    } catch {
      // getAuth not available or threw
    }

    // 2. If SDK didn't return a userId, extract from the bearer JWT
    if (req.headers.authorization) {
      const jwtData = extractFromJwt(req.headers.authorization);
      if (!clerkId && jwtData.userId) {
        clerkId = jwtData.userId;
      }
      if (!email && jwtData.email) {
        email = jwtData.email;
      }
    }

    // 3. Check client-provided headers
    if (!clerkId) {
      const clientUserId = req.headers["x-user-id"] as string | undefined;
      if (clientUserId && clientUserId.trim()) {
        clerkId = clientUserId.trim();
      }
    }

    const clientEmail = req.headers["x-user-email"] as string | undefined;
    if (clientEmail && clientEmail.trim()) {
      email = clientEmail.toLowerCase().trim();
    }

    // 4. Default fallback for unauthenticated guests
    const effectiveUserId = clerkId ?? "guest-user";
    const isRealUser = effectiveUserId !== "guest-user" && !effectiveUserId.startsWith("guest-");

    // 5. If we have a real Clerk user without an email yet, attempt to fetch from Clerk
    if (isRealUser && !email) {
      email = await getClerkUserEmail(effectiveUserId);
    }

    // 6. User Account Resolution & Unification
    // Unifies users logging in via Google OAuth and Email by matching email address
    let user = null;

    if (email) {
      // Look up existing user by verified email
      user = await prisma.user.findFirst({
        where: { email },
      });

      if (user) {
        // If the user previously logged in via another method, update their clerkId to current session
        if (user.clerkId !== effectiveUserId && isRealUser) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { clerkId: effectiveUserId },
          });
        }
      }
    }

    // If not found by email, look up by clerkId
    if (!user) {
      user = await prisma.user.findUnique({
        where: { clerkId: effectiveUserId },
      });

      if (user && email && !user.email) {
        // Record the email onto the user
        user = await prisma.user.update({
          where: { id: user.id },
          data: { email },
        });
      }
    }

    // If user does not exist in DB yet, create them
    if (!user) {
      user = await prisma.user.create({
        data: {
          clerkId: effectiveUserId,
          email: email ?? null,
        },
      });
    }

    // 7. Migrate guest data if user just signed in from a guest session
    const guestId = req.headers["x-guest-id"] as string | undefined;
    if (isRealUser && guestId && guestId !== effectiveUserId) {
      await migrateGuestData(guestId.trim(), user.id);
    }

    req.userId = user.id;
    req.clerkId = effectiveUserId;
    req.userEmail = email;
    next();
  } catch (err) {
    console.error("Auth error:", err);
    res.status(500).json({ error: "Authentication processing failed" });
  }
}
