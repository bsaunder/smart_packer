"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { createApiKey, deleteApiKey } from "@/services/apiKeyService";

export async function createApiKeyAction(name: string) {
  const user = await getCurrentUser();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name is required.");

  const result = await createApiKey(user.id, trimmed);
  revalidatePath("/settings");
  return result;
}

export async function deleteApiKeyAction(formData: FormData) {
  const user = await getCurrentUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await deleteApiKey(user.id, id);
  revalidatePath("/settings");
}
