import { NextRequest } from "next/server";
import { getApiUser, unauthorized } from "@/lib/apiAuth";
import { addItemsToTrip, getTrip, serializeTripDetail } from "@/services/tripService";

/** POST /api/v1/trips/{id}/items → TripService.addItemsToTrip (FR-019a): specific Items plus their children. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const itemIds = Array.isArray(body?.itemIds) ? body.itemIds.filter((x: unknown) => typeof x === "string") : [];
  if (itemIds.length === 0) {
    return Response.json({ error: "'itemIds' (non-empty array) is required." }, { status: 400 });
  }

  try {
    await addItemsToTrip(user.id, id, itemIds);
  } catch {
    return Response.json({ error: "Trip not found." }, { status: 404 });
  }

  const trip = await getTrip(user.id, id);
  if (!trip) return Response.json({ error: "Trip not found." }, { status: 404 });

  return Response.json(serializeTripDetail(trip));
}
