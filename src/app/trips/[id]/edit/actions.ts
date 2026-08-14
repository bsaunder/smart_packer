"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { updateTrip } from "@/services/tripService";

function parseDateInput(raw: FormDataEntryValue | null): Date | undefined {
  const value = String(raw ?? "").trim();
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function updateTripAction(formData: FormData) {
  const user = await getCurrentUser();
  const tripId = String(formData.get("tripId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const destination = String(formData.get("destination") ?? "").trim() || undefined;
  const startDate = parseDateInput(formData.get("startDate"));
  const endDate = parseDateInput(formData.get("endDate"));
  if (!tripId || !name) return;

  await updateTrip(user.id, tripId, { name, destination, startDate, endDate });

  revalidatePath("/trips");
  revalidatePath("/trips/history");
  revalidatePath(`/trips/${tripId}`);
  redirect(`/trips/${tripId}`);
}
