"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import {
  addCustomTripItem,
  addModulesToTrip,
  removeTripItem,
  saveTripItemToMasterList,
  setTripItemBag,
  setTripItemPacked,
  setTripItemQuantity,
} from "@/services/tripService";
import { createBag, deleteBag } from "@/services/bagService";
import { findOrCreateCategoryByName } from "@/services/categoryService";

export async function togglePackedAction(formData: FormData) {
  const user = await getCurrentUser();
  const tripItemId = String(formData.get("tripItemId") ?? "");
  const tripId = String(formData.get("tripId") ?? "");
  const packed = formData.get("packed") === "true";
  if (!tripItemId) return;

  await setTripItemPacked(user.id, tripItemId, packed);
  revalidatePath(`/trips/${tripId}`);
}

export async function updateQuantityAction(formData: FormData) {
  const user = await getCurrentUser();
  const tripItemId = String(formData.get("tripItemId") ?? "");
  const tripId = String(formData.get("tripId") ?? "");
  const quantity = Number(formData.get("quantity") ?? 0);
  if (!tripItemId || !Number.isFinite(quantity) || quantity < 0) return;

  await setTripItemQuantity(user.id, tripItemId, quantity);
  revalidatePath(`/trips/${tripId}`);
}

export async function removeItemAction(formData: FormData) {
  const user = await getCurrentUser();
  const tripItemId = String(formData.get("tripItemId") ?? "");
  const tripId = String(formData.get("tripId") ?? "");
  if (!tripItemId) return;

  await removeTripItem(user.id, tripItemId);
  revalidatePath(`/trips/${tripId}`);
}

export async function addCustomItemAction(formData: FormData) {
  const user = await getCurrentUser();
  const tripId = String(formData.get("tripId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || "Miscellaneous";
  const quantity = Number(formData.get("quantity") ?? 1) || 1;
  if (!tripId || !name) return;

  await findOrCreateCategoryByName(user.id, category);
  await addCustomTripItem(user.id, tripId, { name, category, quantity });
  revalidatePath(`/trips/${tripId}`);
}

export async function saveToMasterListAction(formData: FormData) {
  const user = await getCurrentUser();
  const tripItemId = String(formData.get("tripItemId") ?? "");
  const tripId = String(formData.get("tripId") ?? "");
  if (!tripItemId) return;

  await saveTripItemToMasterList(user.id, tripItemId);
  revalidatePath(`/trips/${tripId}`);
}

export async function addModulesToTripAction(formData: FormData) {
  const user = await getCurrentUser();
  const tripId = String(formData.get("tripId") ?? "");
  const moduleIds = formData.getAll("moduleIds").map(String);
  if (!tripId || moduleIds.length === 0) return;

  await addModulesToTrip(user.id, tripId, moduleIds);
  revalidatePath(`/trips/${tripId}`);
}

export async function assignBagAction(formData: FormData) {
  const user = await getCurrentUser();
  const tripItemId = String(formData.get("tripItemId") ?? "");
  const tripId = String(formData.get("tripId") ?? "");
  const bagId = String(formData.get("bagId") ?? "");
  if (!tripItemId) return;

  await setTripItemBag(user.id, tripItemId, bagId && bagId !== "unassigned" ? bagId : null);
  revalidatePath(`/trips/${tripId}`);
}

export async function createBagAction(formData: FormData) {
  const user = await getCurrentUser();
  const tripId = String(formData.get("tripId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const bagType = String(formData.get("bagType") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();
  const rawWeightLimit = String(formData.get("weightLimit") ?? "").trim();
  if (!tripId || !name) return;

  await createBag(user.id, tripId, {
    name,
    bagType: bagType || undefined,
    color: color || undefined,
    weightLimit: rawWeightLimit ? Number(rawWeightLimit) : undefined,
  });
  revalidatePath(`/trips/${tripId}`);
}

export async function deleteBagAction(formData: FormData) {
  const user = await getCurrentUser();
  const bagId = String(formData.get("bagId") ?? "");
  const tripId = String(formData.get("tripId") ?? "");
  if (!bagId) return;

  await deleteBag(user.id, bagId);
  revalidatePath(`/trips/${tripId}`);
}
