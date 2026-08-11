import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

/**
 * First-run bootstrap only (DESIGN.md "Account provisioning"): applied only
 * if no users exist yet, so re-running this on every container start (the
 * Docker entrypoint does) never resets an admin's password or creates a
 * second account after ADMIN_USERNAME/ADMIN_PASSWORD change.
 */
async function main() {
  const existingUserCount = await prisma.user.count();
  if (existingUserCount > 0) {
    console.log(`${existingUserCount} user(s) already exist — skipping first-run seed.`);
    return;
  }

  const username = process.env.ADMIN_USERNAME ?? "admin";
  const password = process.env.ADMIN_PASSWORD ?? "change-me";

  // Milestone 1: plaintext placeholder until Better Auth wires up real
  // Argon2id hashing (see DESIGN.md Authentication section).
  await prisma.user.create({
    data: {
      username,
      passwordHash: password,
      isAdmin: true,
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
