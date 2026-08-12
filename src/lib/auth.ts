import { betterAuth } from "better-auth";
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
    // users only). Accounts are created server-side via auth.api.signUpEmail
    // by the seed script / future admin tooling, never through this endpoint.
    disableSignUp: true,
    password: {
      // Argon2id, per DESIGN.md's Authentication section ("Argon2id
      // preferred"). Better Auth defaults to Scrypt; @node-rs/argon2 ships
      // prebuilt binaries (no native compilation needed).
      hash: (password) => hash(password),
      verify: ({ hash: h, password }) => verify(h, password),
    },
  },
  plugins: [username(), nextCookies()],
});
