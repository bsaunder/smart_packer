"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { createItem, addChildItem } from "@/services/itemService";
import { findOrCreateCategoryByName } from "@/services/categoryService";

export async function createItemAction(formData: FormData) {
  const user = await getCurrentUser();
  const name = String(formData.get("name") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "");
  const defaultQuantity = Number(formData.get("defaultQuantity") ?? 1) || 1;
  const notes = String(formData.get("notes") ?? "").trim() || undefined;
  if (!name || !categoryId) return;

  await createItem(user.id, { name, categoryId, defaultQuantity, notes });
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
