"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { duplicateTrip } from "@/services/tripService";

function parseDateInput(raw: FormDataEntryValue | null): Date | undefined {
  const value = String(raw ?? "").trim();
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function duplicateTripAction(formData: FormData) {
  const user = await getCurrentUser();
  const sourceTripId = String(formData.get("sourceTripId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const destination = String(formData.get("destination") ?? "").trim() || undefined;
  const startDate = parseDateInput(formData.get("startDate"));
  const endDate = parseDateInput(formData.get("endDate"));
  if (!sourceTripId || !name) return;

  const newTrip = await duplicateTrip(user.id, sourceTripId, { name, destination, startDate, endDate });

  revalidatePath("/trips");
  revalidatePath("/trips/history");
  redirect(`/trips/${newTrip.id}`);
}
