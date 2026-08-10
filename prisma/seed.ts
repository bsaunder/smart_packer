import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const username = process.env.ADMIN_USERNAME ?? "admin";
  const password = process.env.ADMIN_PASSWORD ?? "change-me";

  // Milestone 1: plaintext placeholder until Better Auth wires up real
  // Argon2id hashing (see DESIGN.md Authentication section).
  await prisma.user.upsert({
    where: { username },
    update: {},
    create: {
      username,
      passwordHash: password,
      isAdmin: true,
    },
  });

  console.log(`Seeded dev/admin user "${username}".`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
