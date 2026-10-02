"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { duplicateNameResult, type ActionResult } from "@/lib/errors";
import {
  createModule,
  addItemToModule,
  removeItemFromModule,
  renameModule,
  deleteModule,
} from "@/services/moduleService";

export async function createModuleAction(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  try {
    await createModule(user.id, { name });
  } catch (e) {
    return duplicateNameResult(e);
  }
  revalidatePath("/modules");
}

export async function addItemToModuleAction(formData: FormData) {
  const user = await getCurrentUser();
  const moduleId = String(formData.get("moduleId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  if (!moduleId || !itemId) return;

  await addItemToModule(user.id, moduleId, itemId);
  revalidatePath("/modules");
}

export async function renameModuleAction(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  const moduleId = String(formData.get("moduleId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!moduleId || !name) return;

  try {
    await renameModule(user.id, moduleId, name);
  } catch (e) {
    return duplicateNameResult(e);
  }
  revalidatePath("/modules");
}

export async function deleteModuleAction(formData: FormData) {
  const user = await getCurrentUser();
  const moduleId = String(formData.get("moduleId") ?? "");
  if (!moduleId) return;

  await deleteModule(user.id, moduleId);
  revalidatePath("/modules");
}

export async function removeItemFromModuleAction(formData: FormData) {
  const user = await getCurrentUser();
  const moduleId = String(formData.get("moduleId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  if (!moduleId || !itemId) return;

  await removeItemFromModule(user.id, moduleId, itemId);
  revalidatePath("/modules");
}
