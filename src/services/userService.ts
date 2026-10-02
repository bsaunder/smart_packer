import { randomUUID } from "node:crypto";
import { hash } from "@node-rs/argon2";
import { prisma } from "@/lib/prisma";
import { uniqueName } from "@/lib/errors";

/**
 * Creates a User and its Better Auth credential (Account) row directly via
 * Prisma, bypassing auth.api.signUpEmail (blocked entirely by
 * emailAndPassword.disableSignUp -- see src/lib/auth.ts). Used by both the
 * first-run seed script and admin-driven user creation (FR-052) -- there is
 * no other way to create an account in this app, by design.
 */
export async function createUser(input: { username: string; password: string; isAdmin?: boolean }) {
  const passwordHash = await hash(input.password);

  // Usernames are unique case-insensitively (stored lowercased below).
  const user = await uniqueName(prisma.user.create({
    data: {
      id: randomUUID(),
      // Better Auth's username plugin normalizes to lowercase on lookup
      // (and on write, when going through its own API) -- this bypasses
      // that API, so it must normalize the same way here or sign-in can
      // never find a user whose typed username wasn't already lowercase.
      username: input.username.toLowerCase(),
      displayUsername: input.username,
      name: input.username,
      // Better Auth's core schema requires an email even though this app
      // has no mail server and never uses it. Synthesized from the
      // reserved .invalid TLD (RFC 2606) so it's never a real address.
      email: `${input.username}@local.invalid`,
      emailVerified: false,
      isAdmin: input.isAdmin ?? false,
      isActive: true,
    },
  }), `A user named "${input.username}" already exists.`);

  await prisma.account.create({
    data: {
      id: randomUUID(),
      accountId: user.id,
      providerId: "credential",
      userId: user.id,
      password: passwordHash,
    },
  });

  return user;
}

export async function listUsers() {
  return prisma.user.findMany({ orderBy: { createdAt: "asc" } });
}

/** Refuses to let an admin deactivate their own account (avoids self-lockout mid-session). */
export async function setUserActive(actingUserId: string, targetUserId: string, active: boolean) {
  if (!active && actingUserId === targetUserId) {
    throw new Error("You cannot deactivate your own account.");
  }
  return prisma.user.update({ where: { id: targetUserId }, data: { isActive: active } });
}

/** Admin-driven password reset (FR-052) -- no email flow, since Version 1 has no mail server. */
export async function resetUserPassword(userId: string, newPassword: string) {
  const passwordHash = await hash(newPassword);
  const account = await prisma.account.findFirst({ where: { userId, providerId: "credential" } });
  if (!account) throw new Error("No credential account found for this user.");

  return prisma.account.update({ where: { id: account.id }, data: { password: passwordHash } });
}
