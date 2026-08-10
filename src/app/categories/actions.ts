"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { createCategory } from "@/services/categoryService";

export async function createCategoryAction(formData: FormData) {
  const user = await getCurrentUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await createCategory(user.id, { name });
  revalidatePath("/categories");
}
