import { NextRequest } from "next/server";
import { getApiUser, unauthorized } from "@/lib/apiAuth";
import { generatePackingList, getTrip, serializeTripDetail } from "@/services/tripService";

/** Matches DESIGN.md's own REST API example: POST /api/trips/{id}/generate → TripService.generatePackingList. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const moduleIds = Array.isArray(body?.moduleIds) ? body.moduleIds.filter((x: unknown) => typeof x === "string") : [];
  if (moduleIds.length === 0) {
    return Response.json({ error: "'moduleIds' (non-empty array) is required." }, { status: 400 });
  }

  try {
    await generatePackingList(user.id, id, moduleIds);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Could not generate packing list." }, { status: 400 });
  }

  const trip = await getTrip(user.id, id);
  if (!trip) return Response.json({ error: "Trip not found." }, { status: 404 });

  return Response.json(serializeTripDetail(trip));
}
