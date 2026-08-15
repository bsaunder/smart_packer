import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

const KEY_PREFIX = "spp_";

function hashKey(rawKey: string) {
  return createHash("sha256").update(rawKey).digest("hex");
}

export async function listApiKeys(ownerId: string) {
  return prisma.apiKey.findMany({
    where: { ownerId },
    select: { id: true, name: true, keyPrefix: true, createdAt: true, lastUsedAt: true },
    orderBy: { createdAt: "desc" },
  });
}

/** Returns the raw key exactly once — only its hash is ever persisted. */
export async function createApiKey(ownerId: string, name: string) {
  const rawKey = `${KEY_PREFIX}${randomBytes(24).toString("base64url")}`;
  const keyPrefix = rawKey.slice(0, KEY_PREFIX.length + 6);

  const record = await prisma.apiKey.create({
    data: { ownerId, name, keyHash: hashKey(rawKey), keyPrefix },
    select: { id: true, name: true, keyPrefix: true, createdAt: true },
  });

  return { ...record, rawKey };
}

export async function deleteApiKey(ownerId: string, apiKeyId: string) {
  const key = await prisma.apiKey.findFirst({ where: { id: apiKeyId, ownerId } });
  if (!key) throw new Error("API key not found for this owner.");

  await prisma.apiKey.delete({ where: { id: apiKeyId } });
}

/** Resolves a raw bearer token to its active, non-deactivated owner. Touches lastUsedAt. */
export async function getUserForApiKey(rawKey: string) {
  if (!rawKey.startsWith(KEY_PREFIX)) return null;

  const key = await prisma.apiKey.findUnique({
    where: { keyHash: hashKey(rawKey) },
    include: { owner: true },
  });
  if (!key || !key.owner.isActive) return null;

  await prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });

  return key.owner;
}
