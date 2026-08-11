import { prisma } from "@/lib/prisma";

async function assertOwnsTrip(ownerId: string, tripId: string) {
  const count = await prisma.trip.count({ where: { id: tripId, ownerId } });
  if (!count) throw new Error("Trip not found for this owner.");
}

export async function listBags(ownerId: string, tripId: string) {
  await assertOwnsTrip(ownerId, tripId);
  return prisma.bag.findMany({ where: { tripId }, orderBy: { name: "asc" } });
}

/** Bags are specific to a Trip and never touch master data (FR-021, FR-026). */
export async function createBag(
  ownerId: string,
  tripId: string,
  input: { name: string; bagType?: string; color?: string; weightLimit?: number }
) {
  await assertOwnsTrip(ownerId, tripId);
  return prisma.bag.create({
    data: {
      tripId,
      name: input.name,
      bagType: input.bagType || null,
      color: input.color || null,
      weightLimit: input.weightLimit,
    },
  });
}

/** Unassigns any Trip Items on this Bag (onDelete: SetNull) rather than removing them. */
export async function deleteBag(ownerId: string, bagId: string) {
  const bag = await prisma.bag.findFirst({
    where: { id: bagId, trip: { ownerId } },
  });
  if (!bag) throw new Error("Bag not found for this owner.");
  await prisma.bag.delete({ where: { id: bagId } });
}
