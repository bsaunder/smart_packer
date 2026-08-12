import { betterAuth, APIError } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { username } from "better-auth/plugins/username";
import { nextCookies } from "better-auth/next-js";
import { hash, verify } from "@node-rs/argon2";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.AUTH_SECRET,
  baseURL: process.env.APP_URL,
  emailAndPassword: {
    enabled: true,
    // No self-service signup (DESIGN.md "Account provisioning": admin-created
    // users only). This blocks signUpEmail entirely, including server-side
    // calls -- accounts are created by userService.createUser writing the
    // User + credential Account rows directly via Prisma instead (see
    // prisma/seed.ts and src/app/admin/users).
    disableSignUp: true,
    password: {
      // Argon2id, per DESIGN.md's Authentication section ("Argon2id
      // preferred"). Better Auth defaults to Scrypt; @node-rs/argon2 ships
      // prebuilt binaries (no native compilation needed).
      hash: (password) => hash(password),
      verify: ({ hash: h, password }) => verify(h, password),
    },
  },
  user: {
    additionalFields: {
      // App-specific fields on User, alongside Better Auth's own columns.
      // input: false -- never settable through Better Auth's own
      // update-user endpoint; only userService (admin-only) writes these,
      // directly via Prisma.
      isAdmin: { type: "boolean", required: false, defaultValue: false, input: false },
      isActive: { type: "boolean", required: false, defaultValue: true, input: false },
    },
  },
  databaseHooks: {
    session: {
      create: {
        // Blocks sign-in outright for a deactivated user (FR-052's
        // deactivation actually taking effect, not just a cosmetic flag).
        // getCurrentUser() (src/lib/session.ts) separately re-checks this
        // on every request, so a user deactivated mid-session is also cut
        // off before their existing session cookie expires.
        before: async (session) => {
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { isActive: true },
          });
          if (!user?.isActive) {
            throw new APIError("FORBIDDEN", { message: "This account has been deactivated." });
          }
        },
      },
    },
  },
  plugins: [username(), nextCookies()],
});
