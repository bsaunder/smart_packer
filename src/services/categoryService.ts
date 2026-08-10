import { prisma } from "@/lib/prisma";

export async function listCategories(ownerId: string) {
  return prisma.category.findMany({
    where: { ownerId },
    orderBy: { sortOrder: "asc" },
  });
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
