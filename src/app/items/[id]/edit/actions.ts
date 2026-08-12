"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { updateItem } from "@/services/itemService";

export async function updateItemAction(formData: FormData) {
  const user = await getCurrentUser();
  const itemId = String(formData.get("itemId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "");
  const defaultQuantity = Number(formData.get("defaultQuantity") ?? 1) || 1;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const active = formData.get("active") === "on";
  if (!itemId || !name || !categoryId) return;

  await updateItem(user.id, itemId, { name, categoryId, defaultQuantity, notes, active });

  revalidatePath("/items");
  redirect("/items");
}
