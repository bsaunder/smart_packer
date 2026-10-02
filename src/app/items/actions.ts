"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { duplicateNameResult, type ActionResult } from "@/lib/errors";
import { createItem, addChildItem, updateItem, deleteItem } from "@/services/itemService";
import { findOrCreateCategoryByName } from "@/services/categoryService";
import { parseDefaultBagId } from "./default-bag-select";

export async function createItemAction(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  const name = String(formData.get("name") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "");
  const defaultQuantity = Number(formData.get("defaultQuantity") ?? 1) || 1;
  const notes = String(formData.get("notes") ?? "").trim() || undefined;
  const defaultBagId = parseDefaultBagId(formData.get("defaultBagId"));
  if (!name || !categoryId) return;

  try {
    await createItem(user.id, { name, categoryId, defaultQuantity, notes, defaultBagId });
  } catch (e) {
    return duplicateNameResult(e);
  }
  revalidatePath("/items");
}

export async function createCategoryInlineAction(formData: FormData) {
  const user = await getCurrentUser();
  const name = String(formData.get("newCategoryName") ?? "").trim();
  if (!name) return;
  await findOrCreateCategoryByName(user.id, name);
  revalidatePath("/items");
}

export async function addChildAction(formData: FormData) {
  const user = await getCurrentUser();
  const parentId = String(formData.get("parentId") ?? "");
  const childId = String(formData.get("childId") ?? "");
  if (!parentId || !childId) return;

  await addChildItem(user.id, parentId, childId);
  revalidatePath("/items");
}

export async function deleteItemAction(formData: FormData) {
  const user = await getCurrentUser();
  const itemId = String(formData.get("itemId") ?? "");
  if (!itemId) return;

  await deleteItem(user.id, itemId);
  revalidatePath("/items");
}

export async function setItemActiveAction(formData: FormData) {
  const user = await getCurrentUser();
  const itemId = String(formData.get("itemId") ?? "");
  const active = formData.get("active") === "true";
  if (!itemId) return;

  await updateItem(user.id, itemId, { active });
  revalidatePath("/items");
}
