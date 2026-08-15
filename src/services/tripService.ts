import { prisma } from "@/lib/prisma";
import { getDescendantIds } from "@/services/itemService";
import { findOrCreateCategoryByName } from "@/services/categoryService";

export async function listTrips(ownerId: string) {
  return prisma.trip.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
  });
}

/** For Trip History: every trip, most recently dated first, with item/packed counts. */
export async function listTripsForHistory(ownerId: string) {
  const trips = await prisma.trip.findMany({
    where: { ownerId },
    include: {
      tripItems: { where: { removed: false }, select: { packed: true } },
    },
  });

  return trips
    .map((t) => ({
      ...t,
      itemCount: t.tripItems.length,
      packedCount: t.tripItems.filter((ti) => ti.packed).length,
    }))
    .sort((a, b) => {
      const aDate = a.endDate ?? a.startDate ?? a.createdAt;
      const bDate = b.endDate ?? b.startDate ?? b.createdAt;
      return bDate.getTime() - aDate.getTime();
    });
}

/**
 * For the Dashboard: trips split into upcoming (soonest first) and
 * previous (most recent first), by endDate ?? startDate compared to today.
 * A trip with neither date set is treated as upcoming (still being
 * planned, not yet known to be in the past).
 */
export async function getDashboardTripBuckets(ownerId: string) {
  const trips = await listTripsForHistory(ownerId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = trips
    .filter((t) => {
      const relevant = t.endDate ?? t.startDate;
      return !relevant || relevant.getTime() >= today.getTime();
    })
    .sort((a, b) => {
      // Undated trips sort last (soonest-first order is meaningless for
      // them) rather than by createdAt, which would place a trip created
      // "just now" ahead of one genuinely scheduled for next week.
      const aDate = (a.endDate ?? a.startDate)?.getTime() ?? Infinity;
      const bDate = (b.endDate ?? b.startDate)?.getTime() ?? Infinity;
      return aDate - bDate;
    });

  const previous = trips.filter((t) => {
    const relevant = t.endDate ?? t.startDate;
    return relevant && relevant.getTime() < today.getTime();
  });

  return { upcoming, previous };
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

/** Shared JSON shape for the trip export route and the REST API's GET /trips/:id. */
export function serializeTripDetail(trip: NonNullable<Awaited<ReturnType<typeof getTrip>>>) {
  return {
    id: trip.id,
    name: trip.name,
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
    bags: trip.bags.map((b) => ({
      id: b.id,
      name: b.name,
      bagType: b.bagType,
      color: b.color,
      weightLimit: b.weightLimit,
    })),
    items: trip.tripItems
      .filter((ti) => !ti.removed)
      .map((ti) => ({
        id: ti.id,
        name: ti.name,
        category: ti.category,
        quantity: ti.quantityOverride ?? ti.quantity,
        packed: ti.packed,
        bag: ti.bag?.name ?? null,
        notes: ti.notes,
      })),
  };
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

export async function updateTrip(
  ownerId: string,
  tripId: string,
  input: { name: string; destination?: string; startDate?: Date; endDate?: Date }
) {
  const existing = await prisma.trip.findFirst({ where: { id: tripId, ownerId } });
  if (!existing) throw new Error("Trip not found for this owner.");

  return prisma.trip.update({
    where: { id: tripId },
    data: {
      name: input.name,
      destination: input.destination ?? null,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
    },
  });
}

/** Cascades to delete this Trip's TripItems and Bags (onDelete: Cascade). */
export async function deleteTrip(ownerId: string, tripId: string) {
  const existing = await prisma.trip.findFirst({ where: { id: tripId, ownerId } });
  if (!existing) throw new Error("Trip not found for this owner.");

  await prisma.trip.delete({ where: { id: tripId } });
}

/**
 * Duplicates a Trip: copies its current (non-removed) Trip Items — as
 * actually packed, including custom additions, quantity overrides, and
 * exclusions — and its Bags, into a new Trip. Packed status resets to
 * unpacked; dates are not copied (a duplicate is presumably for a future
 * trip with its own dates). Bag assignments are preserved by recreating
 * each Bag under the new Trip and remapping.
 */
export async function duplicateTrip(
  ownerId: string,
  sourceTripId: string,
  input: { name: string; destination?: string; startDate?: Date; endDate?: Date }
) {
  const source = await prisma.trip.findFirst({
    where: { id: sourceTripId, ownerId },
    include: {
      bags: true,
      tripItems: { where: { removed: false } },
    },
  });
  if (!source) throw new Error("Trip not found for this owner.");

  return prisma.$transaction(async (tx) => {
    const newTrip = await tx.trip.create({
      data: {
        ownerId,
        name: input.name,
        destination: input.destination,
        startDate: input.startDate,
        endDate: input.endDate,
      },
    });

    const bagIdMap = new Map<string, string>();
    for (const bag of source.bags) {
      const newBag = await tx.bag.create({
        data: {
          tripId: newTrip.id,
          name: bag.name,
          bagType: bag.bagType,
          color: bag.color,
          weightLimit: bag.weightLimit,
        },
      });
      bagIdMap.set(bag.id, newBag.id);
    }

    if (source.tripItems.length > 0) {
      await tx.tripItem.createMany({
        data: source.tripItems.map((item) => ({
          tripId: newTrip.id,
          sourceItemId: item.sourceItemId,
          name: item.name,
          category: item.category,
          notes: item.notes,
          quantity: item.quantity,
          quantityOverride: item.quantityOverride,
          tripNotes: item.tripNotes,
          bagId: item.bagId ? (bagIdMap.get(item.bagId) ?? null) : null,
          packed: false,
        })),
      });
    }

    return newTrip;
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

/**
 * Links a custom (not module-sourced) trip item to a master Item so it can
 * be reused on future trips — creating that Item (and its Category) if one
 * doesn't already exist by name, or linking to the existing one otherwise.
 * The trip item itself is left as-is (still a snapshot per FR-014a).
 */
export async function saveTripItemToMasterList(ownerId: string, tripItemId: string) {
  const tripItem = await prisma.tripItem.findFirst({
    where: { id: tripItemId, trip: { ownerId } },
  });
  if (!tripItem) throw new Error("Trip item not found for this owner.");
  if (tripItem.sourceItemId) return tripItem;

  const existingItem = await prisma.item.findUnique({
    where: { ownerId_name: { ownerId, name: tripItem.name } },
  });

  const item =
    existingItem ??
    (await prisma.item.create({
      data: {
        ownerId,
        name: tripItem.name,
        categoryId: (await findOrCreateCategoryByName(ownerId, tripItem.category)).id,
        defaultQuantity: tripItem.quantity,
        notes: tripItem.notes,
      },
    }));

  return prisma.tripItem.update({
    where: { id: tripItemId },
    data: { sourceItemId: item.id },
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

/**
 * Assigns (or clears, with bagId null) a Trip Item's Bag. Bags are always
 * scoped to the same Trip as the item (FR-022, FR-023); packing status is
 * untouched (FR-025).
 */
export async function setTripItemBag(
  ownerId: string,
  tripItemId: string,
  bagId: string | null
) {
  const tripItem = await prisma.tripItem.findFirst({
    where: { id: tripItemId, trip: { ownerId } },
    select: { tripId: true },
  });
  if (!tripItem) throw new Error("Trip item not found for this owner.");

  if (bagId) {
    const bag = await prisma.bag.findFirst({ where: { id: bagId, tripId: tripItem.tripId } });
    if (!bag) throw new Error("Bag not found for this trip.");
  }

  return prisma.tripItem.update({
    where: { id: tripItemId },
    data: { bagId },
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
