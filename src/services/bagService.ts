import { prisma } from "@/lib/prisma";
import { uniqueName } from "@/lib/errors";

type BagInput = { name: string; bagType?: string; color?: string; weightLimit?: number };

/** Master Bags (FR-021): owner-level, shared by every Trip, like Categories. */
export async function listBags(ownerId: string) {
  return prisma.bag.findMany({
    where: { ownerId },
    orderBy: { name: "asc" },
    include: { _count: { select: { items: true } } },
  });
}

/**
 * Bag names are unique per owner: they're how CSV `default_bag` references
 * a bag and how the By Bag view groups items. Two physically identical bags
 * get distinguishing names, e.g. "Pelican Air (Blue)" / "Pelican Air (Black)".
 */
const nameTaken = ({ name, color }: BagInput) =>
  `You already have a bag named "${name}". Bag names must be unique, so add what tells them apart, e.g. "${name} (${color || 2})".`;

export async function createBag(ownerId: string, input: BagInput) {
  return uniqueName(
    prisma.bag.create({
      data: {
        ownerId,
        name: input.name,
        bagType: input.bagType || null,
        color: input.color || null,
        weightLimit: input.weightLimit,
      },
    }),
    nameTaken(input)
  );
}

export async function findOrCreateBagByName(ownerId: string, name: string) {
  const existing = await prisma.bag.findUnique({ where: { ownerId_name: { ownerId, name } } });
  return existing ?? createBag(ownerId, { name });
}

export async function updateBag(ownerId: string, bagId: string, input: BagInput) {
  await assertOwnsBag(ownerId, bagId);
  return uniqueName(
    prisma.bag.update({
      where: { id: bagId },
      data: {
        name: input.name,
        bagType: input.bagType || null,
        color: input.color || null,
        weightLimit: input.weightLimit ?? null,
      },
    }),
    nameTaken(input)
  );
}

/**
 * Inactive bags drop out of the bag pickers (item default, trip assignment)
 * but stay on any Trip that already uses them — retiring a bag doesn't
 * rewrite packing history.
 */
export async function setBagActive(ownerId: string, bagId: string, active: boolean) {
  await assertOwnsBag(ownerId, bagId);
  return prisma.bag.update({ where: { id: bagId }, data: { active } });
}

/**
 * Items defaulting to this Bag lose their default, and Trip Items in it —
 * on every Trip, past ones included — become unassigned (both onDelete:
 * SetNull). Setting the bag inactive is the history-preserving alternative.
 */
export async function deleteBag(ownerId: string, bagId: string) {
  await assertOwnsBag(ownerId, bagId);
  await prisma.bag.delete({ where: { id: bagId } });
}

export async function assertOwnsBag(ownerId: string, bagId: string) {
  const count = await prisma.bag.count({ where: { id: bagId, ownerId } });
  if (!count) throw new Error("Bag not found for this owner.");
}
