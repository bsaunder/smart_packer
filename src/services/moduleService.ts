import { prisma } from "@/lib/prisma";
import { getDescendantIds } from "@/services/itemService";

export async function listModules(ownerId: string) {
  return prisma.module.findMany({
    where: { ownerId },
    include: { moduleItems: { include: { item: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createModule(ownerId: string, input: { name: string }) {
  return prisma.module.create({
    data: { ownerId, name: input.name },
  });
}

/**
 * Adds an Item to a Module, then recursively auto-adds all of its
 * (cycle-safe) descendant items, skipping any already present (FR-009,
 * FR-010).
 */
export async function addItemToModule(
  ownerId: string,
  moduleId: string,
  itemId: string
) {
  const owned = await prisma.module.count({ where: { id: moduleId, ownerId } });
  if (!owned) throw new Error("Module not found for this owner.");

  const descendants = await getDescendantIds(itemId);
  const idsToAdd = [itemId, ...descendants];

  const existing = await prisma.moduleItem.findMany({
    where: { moduleId, itemId: { in: idsToAdd } },
    select: { itemId: true },
  });
  const existingIds = new Set(existing.map((e) => e.itemId));
  const newIds = idsToAdd.filter((id) => !existingIds.has(id));

  if (newIds.length === 0) return { added: [] as string[] };

  await prisma.moduleItem.createMany({
    data: newIds.map((id) => ({ moduleId, itemId: id })),
    skipDuplicates: true,
  });

  return { added: newIds };
}

export async function removeItemFromModule(
  ownerId: string,
  moduleId: string,
  itemId: string
) {
  const owned = await prisma.module.count({ where: { id: moduleId, ownerId } });
  if (!owned) throw new Error("Module not found for this owner.");

  await prisma.moduleItem.deleteMany({ where: { moduleId, itemId } });
}
