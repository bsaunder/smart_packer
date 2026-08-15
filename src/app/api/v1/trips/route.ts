import { NextRequest } from "next/server";
import { getApiUser, unauthorized } from "@/lib/apiAuth";
import { createTrip, generatePackingList, listTrips } from "@/services/tripService";

export async function GET(request: NextRequest) {
  const user = await getApiUser(request);
  if (!user) return unauthorized();

  const trips = await listTrips(user.id);
  return Response.json({ trips });
}

export async function POST(request: NextRequest) {
  const user = await getApiUser(request);
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return Response.json({ error: "'name' is required." }, { status: 400 });
  }

  const destination = typeof body?.destination === "string" ? body.destination : undefined;
  const startDate = typeof body?.startDate === "string" ? new Date(body.startDate) : undefined;
  const endDate = typeof body?.endDate === "string" ? new Date(body.endDate) : undefined;
  const moduleIds = Array.isArray(body?.moduleIds) ? body.moduleIds.filter((x: unknown) => typeof x === "string") : [];

  const trip = await createTrip(user.id, { name, destination, startDate, endDate });
  if (moduleIds.length > 0) {
    await generatePackingList(user.id, trip.id, moduleIds);
  }

  return Response.json({ trip }, { status: 201 });
}
