"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { createCategory, moveCategory } from "@/services/categoryService";

export async function createCategoryAction(formData: FormData) {
  const user = await getCurrentUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await createCategory(user.id, { name });
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
