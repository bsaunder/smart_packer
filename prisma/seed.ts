import "dotenv/config";
import { randomUUID } from "node:crypto";
import { hash } from "@node-rs/argon2";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

/**
 * First-run bootstrap only (DESIGN.md "Account provisioning"): applied only
 * if no users exist yet, so re-running this on every container start (the
 * Docker entrypoint does) never resets an admin's password or creates a
 * second account after ADMIN_USERNAME/ADMIN_PASSWORD change.
 *
 * Creates the User row and its Better Auth credential (Account) row
 * directly rather than via auth.api.signUpEmail, because emailAndPassword
 * is configured with disableSignUp: true (DESIGN.md: admin-created users
 * only, no self-service signup) -- that flag blocks signUpEmail entirely,
 * including server-side calls, not just the public HTTP route. The Argon2id
 * hash() call here is the exact same one src/lib/auth.ts configures Better
 * Auth to use, so the resulting Account.password verifies correctly on login.
 */
async function main() {
  const existingUserCount = await prisma.user.count();
  if (existingUserCount > 0) {
    console.log(`${existingUserCount} user(s) already exist — skipping first-run seed.`);
    return;
  }

  const username = process.env.ADMIN_USERNAME ?? "admin";
  const password = process.env.ADMIN_PASSWORD ?? "change-me";
  const passwordHash = await hash(password);

  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      username,
      displayUsername: username,
      name: username,
      // Better Auth's core schema requires an email even though this app
      // has no mail server and never uses it (DESIGN.md: admin-driven
      // password reset, no self-service email flows). Synthesized from the
      // reserved .invalid TLD (RFC 2606) so it's never a real, deliverable
      // address.
      email: `${username}@local.invalid`,
      emailVerified: false,
      isAdmin: true,
      isActive: true,
    },
  });

  await prisma.account.create({
    data: {
      id: randomUUID(),
      accountId: user.id,
      providerId: "credential",
      userId: user.id,
      password: passwordHash,
    },
  });

  console.log(`Seeded initial admin user "${username}".`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
