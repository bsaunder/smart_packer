"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { createTrip, generatePackingList } from "@/services/tripService";

export async function createTripAction(formData: FormData) {
  const user = await getCurrentUser();
  const name = String(formData.get("name") ?? "").trim();
  const destination = String(formData.get("destination") ?? "").trim() || undefined;
  const moduleIds = formData.getAll("moduleIds").map(String);
  if (!name) return;

  const trip = await createTrip(user.id, { name, destination });
  if (moduleIds.length > 0) {
    await generatePackingList(user.id, trip.id, moduleIds);
  }

  revalidatePath("/trips");
  redirect(`/trips/${trip.id}`);
}
