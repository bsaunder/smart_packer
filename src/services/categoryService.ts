import { prisma } from "@/lib/prisma";

export async function listCategories(ownerId: string) {
  return prisma.category.findMany({
    where: { ownerId },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { items: true } } },
  });
}

export async function countCategories(ownerId: string) {
  return prisma.category.count({ where: { ownerId } });
}

export async function createCategory(
  ownerId: string,
  input: { name: string }
) {
  const last = await prisma.category.findFirst({
    where: { ownerId },
    orderBy: { sortOrder: "desc" },
  });

  return prisma.category.create({
    data: {
      ownerId,
      name: input.name,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });
}

export async function findOrCreateCategoryByName(
  ownerId: string,
  name: string
) {
  const existing = await prisma.category.findUnique({
    where: { ownerId_name: { ownerId, name } },
  });
  if (existing) return existing;
  return createCategory(ownerId, { name });
}

export async function updateCategory(
  ownerId: string,
  categoryId: string,
  input: { name: string }
) {
  const existing = await prisma.category.findFirst({ where: { id: categoryId, ownerId } });
  if (!existing) throw new Error("Category not found for this owner.");

  return prisma.category.update({
    where: { id: categoryId },
    data: { name: input.name },
  });
}

/**
 * Items reference their Category with onDelete: Restrict, so any Items still
 * in this Category are moved to (find-or-create) "Miscellaneous" first.
 */
export async function deleteCategory(ownerId: string, categoryId: string) {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, ownerId },
    include: { _count: { select: { items: true } } },
  });
  if (!category) throw new Error("Category not found for this owner.");

  if (category._count.items > 0) {
    const fallback = await findOrCreateCategoryByName(ownerId, "Miscellaneous");
    if (fallback.id === categoryId) {
      throw new Error("Cannot delete the Miscellaneous category while it still has items.");
    }
    await prisma.item.updateMany({ where: { categoryId }, data: { categoryId: fallback.id } });
  }

  await prisma.category.delete({ where: { id: categoryId } });
}

export async function reorderCategories(ownerId: string, orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.category.update({
        where: { id, ownerId },
        data: { sortOrder: index },
      })
    )
  );
}

/** Swaps a Category with its immediate neighbor in display order. A no-op at either end of the list. */
export async function moveCategory(
  ownerId: string,
  categoryId: string,
  direction: "up" | "down"
) {
  const categories = await listCategories(ownerId);
  const index = categories.findIndex((c) => c.id === categoryId);
  if (index === -1) throw new Error("Category not found for this owner.");

  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= categories.length) return;

  const a = categories[index];
  const b = categories[swapWith];

  await prisma.$transaction([
    prisma.category.update({ where: { id: a.id, ownerId }, data: { sortOrder: b.sortOrder } }),
    prisma.category.update({ where: { id: b.id, ownerId }, data: { sortOrder: a.sortOrder } }),
  ]);
}
