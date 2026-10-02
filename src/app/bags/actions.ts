"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { createBag, deleteBag, setBagActive, updateBag } from "@/services/bagService";
import { duplicateNameResult, type ActionResult } from "@/lib/errors";

function bagInput(formData: FormData) {
  const rawWeightLimit = String(formData.get("weightLimit") ?? "").trim();
  return {
    name: String(formData.get("name") ?? "").trim(),
    bagType: String(formData.get("bagType") ?? "").trim() || undefined,
    color: String(formData.get("color") ?? "").trim() || undefined,
    weightLimit: rawWeightLimit ? Number(rawWeightLimit) : undefined,
  };
}

export async function createBagAction(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  const input = bagInput(formData);
  if (!input.name) return;

  try {
    await createBag(user.id, input);
  } catch (e) {
    return duplicateNameResult(e);
  }
  revalidatePath("/bags");
}

export async function updateBagAction(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  const bagId = String(formData.get("bagId") ?? "");
  const input = bagInput(formData);
  if (!bagId || !input.name) return;

  try {
    await updateBag(user.id, bagId, input);
  } catch (e) {
    return duplicateNameResult(e);
  }
  revalidatePath("/bags");
}

export async function setBagActiveAction(formData: FormData) {
  const user = await getCurrentUser();
  const bagId = String(formData.get("bagId") ?? "");
  const active = formData.get("active") === "true";
  if (!bagId) return;

  await setBagActive(user.id, bagId, active);
  revalidatePath("/bags");
}

export async function deleteBagAction(formData: FormData) {
  const user = await getCurrentUser();
  const bagId = String(formData.get("bagId") ?? "");
  if (!bagId) return;

  await deleteBag(user.id, bagId);
  revalidatePath("/bags");
}
