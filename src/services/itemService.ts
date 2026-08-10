import { prisma } from "@/lib/prisma";

export async function listItems(ownerId: string) {
  return prisma.item.findMany({
    where: { ownerId },
    include: {
      category: true,
      childLinks: { include: { childItem: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function createItem(
  ownerId: string,
  input: {
    name: string;
    categoryId: string;
    defaultQuantity?: number;
    notes?: string;
    active?: boolean;
  }
) {
  return prisma.item.create({
    data: {
      ownerId,
      name: input.name,
      categoryId: input.categoryId,
      defaultQuantity: input.defaultQuantity ?? 1,
      notes: input.notes,
      active: input.active ?? true,
    },
  });
}

export async function updateItem(
  ownerId: string,
  itemId: string,
  input: Partial<{
    name: string;
    categoryId: string;
    defaultQuantity: number;
    notes: string | null;
    active: boolean;
  }>
) {
  return prisma.item.update({
    where: { id: itemId, ownerId },
    data: input,
  });
}

/**
 * Adds parentId -> childId. Throws if this would create a cycle (a child
 * that is, directly or transitively, an ancestor of the parent) or a
 * self-reference. Duplicate links are no-ops.
 */
export async function addChildItem(
  ownerId: string,
  parentId: string,
  childId: string
) {
  if (parentId === childId) {
    throw new Error("An item cannot be its own child.");
  }

  await assertOwnsItems(ownerId, [parentId, childId]);

  const existing = await prisma.itemParentChild.findUnique({
    where: { parentItemId_childItemId: { parentItemId: parentId, childItemId: childId } },
  });
  if (existing) return existing;

  const descendantsOfChild = await getDescendantIds(childId);
  if (descendantsOfChild.has(parentId)) {
    throw new Error("Adding this child would create a parent/child cycle.");
  }

  return prisma.itemParentChild.create({
    data: { parentItemId: parentId, childItemId: childId },
  });
}

export async function removeChildItem(
  ownerId: string,
  parentId: string,
  childId: string
) {
  await assertOwnsItems(ownerId, [parentId, childId]);
  await prisma.itemParentChild.deleteMany({
    where: { parentItemId: parentId, childItemId: childId },
  });
}

/** All descendant item ids of `itemId`, recursive and cycle-safe. */
export async function getDescendantIds(itemId: string): Promise<Set<string>> {
  const visited = new Set<string>();
  const queue = [itemId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const links = await prisma.itemParentChild.findMany({
      where: { parentItemId: current },
      select: { childItemId: true },
    });
    for (const { childItemId } of links) {
      if (!visited.has(childItemId)) {
        visited.add(childItemId);
        queue.push(childItemId);
      }
    }
  }

  return visited;
}

async function assertOwnsItems(ownerId: string, itemIds: string[]) {
  const count = await prisma.item.count({
    where: { id: { in: itemIds }, ownerId },
  });
  if (count !== itemIds.length) {
    throw new Error("Item not found for this owner.");
  }
}
