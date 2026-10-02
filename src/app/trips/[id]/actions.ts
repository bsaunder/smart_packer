"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import {
  addCustomTripItem,
  addItemsToTrip,
  addModulesToTrip,
  removeTripItem,
  saveTripItemToMasterList,
  setTripItemBag,
  setTripItemPacked,
  setTripItemQuantity,
} from "@/services/tripService";
import { findOrCreateBagByName } from "@/services/bagService";
import { addCustomTripTask, addTasksToTrip, removeTripTask, setTripTaskDone } from "@/services/tripTaskService";
import { parseTiming } from "@/lib/taskTiming";
import type { ActionResult } from "@/lib/errors";
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

export async function addItemsToTripAction(formData: FormData) {
  const user = await getCurrentUser();
  const tripId = String(formData.get("tripId") ?? "");
  const itemIds = formData.getAll("itemIds").map(String);
  if (!tripId || itemIds.length === 0) return;

  await addItemsToTrip(user.id, tripId, itemIds);
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

/**
 * Quick-creates a master Bag from the trip page (for a bag first needed on
 * this trip), so it's immediately available in every item's bag picker.
 * Reuses an existing bag of the same name rather than failing.
 */
export async function createBagAction(formData: FormData) {
  const user = await getCurrentUser();
  const tripId = String(formData.get("tripId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!tripId || !name) return;

  await findOrCreateBagByName(user.id, name);
  revalidatePath(`/trips/${tripId}`);
}

export async function toggleTaskDoneAction(formData: FormData) {
  const user = await getCurrentUser();
  const tripTaskId = String(formData.get("tripTaskId") ?? "");
  const tripId = String(formData.get("tripId") ?? "");
  if (!tripTaskId) return;

  await setTripTaskDone(user.id, tripTaskId, formData.get("done") === "true");
  revalidatePath(`/trips/${tripId}`);
}

export async function removeTripTaskAction(formData: FormData) {
  const user = await getCurrentUser();
  const tripTaskId = String(formData.get("tripTaskId") ?? "");
  const tripId = String(formData.get("tripId") ?? "");
  if (!tripTaskId) return;

  await removeTripTask(user.id, tripTaskId);
  revalidatePath(`/trips/${tripId}`);
}

export async function addTasksToTripAction(formData: FormData) {
  const user = await getCurrentUser();
  const tripId = String(formData.get("tripId") ?? "");
  const taskIds = formData.getAll("taskIds").map(String);
  if (!tripId || taskIds.length === 0) return;

  await addTasksToTrip(user.id, tripId, taskIds);
  revalidatePath(`/trips/${tripId}`);
}

export async function addCustomTaskAction(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  const tripId = String(formData.get("tripId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const timing = parseTiming(formData);
  if (!tripId || !name) return;
  if (!timing || timing.offsetDays === null) return { error: "Enter a whole number of days (0 or more)." };

  await addCustomTripTask(user.id, tripId, { name, anchor: timing.anchor, offsetDays: timing.offsetDays });
  revalidatePath(`/trips/${tripId}`);
}
