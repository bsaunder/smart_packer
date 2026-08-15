import { NextRequest } from "next/server";
import { getApiUser, unauthorized } from "@/lib/apiAuth";
import { deleteTrip, getTrip, serializeTripDetail } from "@/services/tripService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  const trip = await getTrip(user.id, id);
  if (!trip) return Response.json({ error: "Trip not found." }, { status: 404 });

  return Response.json(serializeTripDetail(trip));
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  try {
    await deleteTrip(user.id, id);
  } catch {
    return Response.json({ error: "Trip not found." }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
