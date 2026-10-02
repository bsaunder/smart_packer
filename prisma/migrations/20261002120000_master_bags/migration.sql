-- Bags become owner-level master data (like Category) instead of per-Trip
-- rows, and Items gain an optional default Bag.
--
-- Existing per-Trip bags are converted in place, not dropped: each takes its
-- Trip's owner, then same-named bags of one owner (e.g. "Checked Suitcase"
-- recreated on five trips) are merged into one, with their Trip Items
-- repointed at the surviving row, so no trip loses its bag assignments.

-- 1. Owner + active columns; ownerId backfilled from the bag's trip.
ALTER TABLE "Bag" ADD COLUMN "ownerId" TEXT,
ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

UPDATE "Bag" b SET "ownerId" = t."ownerId" FROM "Trip" t WHERE t."id" = b."tripId";

-- 2. Merge duplicates per (ownerId, name): keep the lowest id per group.
WITH ranked AS (
  SELECT "id", FIRST_VALUE("id") OVER (PARTITION BY "ownerId", "name" ORDER BY "id") AS keep_id
  FROM "Bag"
)
UPDATE "TripItem" ti SET "bagId" = r.keep_id
FROM ranked r
WHERE ti."bagId" = r."id" AND r."id" <> r.keep_id;

DELETE FROM "Bag" b
USING "Bag" keeper
WHERE keeper."ownerId" = b."ownerId" AND keeper."name" = b."name" AND keeper."id" < b."id";

-- 3. Detach from Trip.
ALTER TABLE "Bag" DROP CONSTRAINT "Bag_tripId_fkey";
DROP INDEX "Bag_tripId_idx";
ALTER TABLE "Bag" DROP COLUMN "tripId";
ALTER TABLE "Bag" ALTER COLUMN "ownerId" SET NOT NULL;

CREATE INDEX "Bag_ownerId_idx" ON "Bag"("ownerId");
CREATE UNIQUE INDEX "Bag_ownerId_name_key" ON "Bag"("ownerId", "name");
ALTER TABLE "Bag" ADD CONSTRAINT "Bag_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Item default bag.
ALTER TABLE "Item" ADD COLUMN "defaultBagId" TEXT;
CREATE INDEX "Item_defaultBagId_idx" ON "Item"("defaultBagId");
ALTER TABLE "Item" ADD CONSTRAINT "Item_defaultBagId_fkey" FOREIGN KEY ("defaultBagId") REFERENCES "Bag"("id") ON DELETE SET NULL ON UPDATE CASCADE;
