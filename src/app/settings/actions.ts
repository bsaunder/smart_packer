"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { validateImport, commitImport, type ImportPreview } from "@/services/importService";

export async function previewImportAction(csvText: string): Promise<ImportPreview> {
  const user = await getCurrentUser();
  return validateImport(user.id, csvText);
}

export async function commitImportAction(csvText: string): Promise<ImportPreview> {
  const user = await getCurrentUser();
  const result = await commitImport(user.id, csvText);
  if (result.errors.length === 0) {
    revalidatePath("/categories");
    revalidatePath("/items");
    revalidatePath("/modules");
  }
  return result;
}
