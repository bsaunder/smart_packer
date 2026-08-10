import { prisma } from "@/lib/prisma";
import { getDescendantIds } from "@/services/itemService";

export async function listTrips(ownerId: string) {
  return prisma.trip.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTrip(ownerId: string, tripId: string) {
  return prisma.trip.findFirst({
    where: { id: tripId, ownerId },
    include: {
      tripItems: { include: { bag: true }, orderBy: { name: "asc" } },
      bags: true,
    },
  });
}

export async function createTrip(
  ownerId: string,
  input: {
    name: string;
    destination?: string;
    startDate?: Date;
    endDate?: Date;
  }
) {
  return prisma.trip.create({
    data: {
      ownerId,
      name: input.name,
      destination: input.destination,
      startDate: input.startDate,
      endDate: input.endDate,
    },
  });
}

/** Collects every Item across the given Modules, recursively expanded and deduplicated. */
async function collectExpandedItemIds(ownerId: string, moduleIds: string[]) {
  const moduleItems = await prisma.moduleItem.findMany({
    where: { moduleId: { in: moduleIds }, module: { ownerId } },
    select: { itemId: true },
  });

  const ids = new Set(moduleItems.map((mi) => mi.itemId));
  for (const id of [...ids]) {
    const descendants = await getDescendantIds(id);
    for (const d of descendants) ids.add(d);
  }
  return ids;
}

/** One-shot generation (FR-012–FR-014a). Fails if the Trip already has items. */
export async function generatePackingList(
  ownerId: string,
  tripId: string,
  moduleIds: string[]
) {
  const trip = await prisma.trip.findFirst({ where: { id: tripId, ownerId } });
  if (!trip) throw new Error("Trip not found for this owner.");

  const existingCount = await prisma.tripItem.count({ where: { tripId } });
  if (existingCount > 0) {
    throw new Error(
      "Trip already has a generated packing list; use addModulesToTrip to add more items."
    );
  }

  return mergeItemsIntoTrip(ownerId, tripId, moduleIds);
}

/** Adds one or more additional Modules to an existing Trip (FR-016a). */
export async function addModulesToTrip(
  ownerId: string,
  tripId: string,
  moduleIds: string[]
) {
  const trip = await prisma.trip.findFirst({ where: { id: tripId, ownerId } });
  if (!trip) throw new Error("Trip not found for this owner.");

  return mergeItemsIntoTrip(ownerId, tripId, moduleIds);
}

async function mergeItemsIntoTrip(
  ownerId: string,
  tripId: string,
  moduleIds: string[]
) {
  const itemIds = await collectExpandedItemIds(ownerId, moduleIds);

  const alreadyPresent = await prisma.tripItem.findMany({
    where: { tripId, sourceItemId: { in: [...itemIds] } },
    select: { sourceItemId: true },
  });
  const presentIds = new Set(alreadyPresent.map((t) => t.sourceItemId));

  const toAdd = [...itemIds].filter((id) => !presentIds.has(id));
  if (toAdd.length === 0) return { added: 0 };

  const items = await prisma.item.findMany({
    where: { id: { in: toAdd }, ownerId },
    include: { category: true },
  });

  await prisma.tripItem.createMany({
    data: items.map((item) => ({
      tripId,
      sourceItemId: item.id,
      name: item.name,
      category: item.category.name,
      notes: item.notes,
      quantity: item.defaultQuantity,
    })),
  });

  return { added: items.length };
}

export async function addCustomTripItem(
  ownerId: string,
  tripId: string,
  input: { name: string; category: string; quantity?: number; notes?: string }
) {
  const trip = await prisma.trip.findFirst({ where: { id: tripId, ownerId } });
  if (!trip) throw new Error("Trip not found for this owner.");

  return prisma.tripItem.create({
    data: {
      tripId,
      name: input.name,
      category: input.category,
      quantity: input.quantity ?? 1,
      notes: input.notes,
    },
  });
}

export async function setTripItemQuantity(
  ownerId: string,
  tripItemId: string,
  quantity: number
) {
  await assertOwnsTripItem(ownerId, tripItemId);
  return prisma.tripItem.update({
    where: { id: tripItemId },
    data: { quantityOverride: quantity },
  });
}

export async function setTripItemPacked(
  ownerId: string,
  tripItemId: string,
  packed: boolean
) {
  await assertOwnsTripItem(ownerId, tripItemId);
  return prisma.tripItem.update({
    where: { id: tripItemId },
    data: { packed },
  });
}

/** Removes an item from a single Trip only (FR-018); master data is untouched. */
export async function removeTripItem(ownerId: string, tripItemId: string) {
  await assertOwnsTripItem(ownerId, tripItemId);
  return prisma.tripItem.update({
    where: { id: tripItemId },
    data: { removed: true },
  });
}

async function assertOwnsTripItem(ownerId: string, tripItemId: string) {
  const count = await prisma.tripItem.count({
    where: { id: tripItemId, trip: { ownerId } },
  });
  if (!count) throw new Error("Trip item not found for this owner.");
}
