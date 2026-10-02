"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { userErrorResult, type ActionResult } from "@/lib/errors";
import { createCategory, deleteCategory, moveCategory, updateCategory } from "@/services/categoryService";

export async function createCategoryAction(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  try {
    await createCategory(user.id, { name });
  } catch (e) {
    return userErrorResult(e);
  }
  revalidatePath("/categories");
}

export async function updateCategoryAction(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  const categoryId = String(formData.get("categoryId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!categoryId || !name) return;

  try {
    await updateCategory(user.id, categoryId, { name });
  } catch (e) {
    return userErrorResult(e);
  }
  revalidatePath("/categories");
}

export async function deleteCategoryAction(formData: FormData) {
  const user = await getCurrentUser();
  const categoryId = String(formData.get("categoryId") ?? "");
  if (!categoryId) return;

  await deleteCategory(user.id, categoryId);
  revalidatePath("/categories");
}

export async function moveCategoryAction(formData: FormData) {
  const user = await getCurrentUser();
  const categoryId = String(formData.get("categoryId") ?? "");
  const direction = formData.get("direction") === "up" ? "up" : "down";
  if (!categoryId) return;

  await moveCategory(user.id, categoryId, direction);
  revalidatePath("/categories");
}
