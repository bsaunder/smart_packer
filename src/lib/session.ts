import { prisma } from "@/lib/prisma";

/**
 * Milestone 1 stub: real auth (Better Auth) isn't wired up yet, so every
 * request acts as the single dev user seeded by `prisma/seed.ts`. Services
 * already take an explicit ownerId, so swapping this for a real session
 * lookup later is a one-function change.
 */
export async function getCurrentUser() {
  const user = await prisma.user.findUnique({
    where: { username: process.env.ADMIN_USERNAME ?? "admin" },
  });

  if (!user) {
    throw new Error(
      "No dev user found — run `pnpm db:seed` before using the app."
    );
  }

  return user;
}
