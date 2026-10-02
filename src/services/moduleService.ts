import { prisma } from "@/lib/prisma";
import { getDescendantIds } from "@/services/itemService";
import { uniqueName } from "@/lib/errors";

const nameTaken = (name: string) => `You already have a module named "${name}".`;

export async function listModules(ownerId: string) {
  return prisma.module.findMany({
    where: { ownerId },
    include: { moduleItems: { include: { item: true } } },
    orderBy: { name: "asc" },
  });
}

export async function countModules(ownerId: string) {
  return prisma.module.count({ where: { ownerId } });
}

export async function createModule(ownerId: string, input: { name: string }) {
  return uniqueName(prisma.module.create({ data: { ownerId, name: input.name } }), nameTaken(input.name));
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

export async function renameModule(ownerId: string, moduleId: string, name: string) {
  const owned = await prisma.module.count({ where: { id: moduleId, ownerId } });
  if (!owned) throw new Error("Module not found for this owner.");

  return uniqueName(prisma.module.update({ where: { id: moduleId }, data: { name } }), nameTaken(name));
}

/** ModuleItem rows cascade automatically (onDelete: Cascade); the underlying Items are untouched. */
export async function deleteModule(ownerId: string, moduleId: string) {
  const owned = await prisma.module.count({ where: { id: moduleId, ownerId } });
  if (!owned) throw new Error("Module not found for this owner.");

  await prisma.module.delete({ where: { id: moduleId } });
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
