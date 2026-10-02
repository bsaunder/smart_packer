"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { duplicateNameResult, type ActionResult } from "@/lib/errors";
import { updateItem } from "@/services/itemService";
import { parseDefaultBagId } from "../../default-bag-select";

export async function updateItemAction(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  const itemId = String(formData.get("itemId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "");
  const defaultQuantity = Number(formData.get("defaultQuantity") ?? 1) || 1;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const active = formData.get("active") === "on";
  const defaultBagId = parseDefaultBagId(formData.get("defaultBagId"));
  if (!itemId || !name || !categoryId) return;

  try {
    await updateItem(user.id, itemId, { name, categoryId, defaultQuantity, notes, active, defaultBagId });
  } catch (e) {
    return duplicateNameResult(e);
  }

  revalidatePath("/items");
  redirect("/items");
}
