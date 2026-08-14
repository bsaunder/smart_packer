"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import {
  createModule,
  addItemToModule,
  removeItemFromModule,
  renameModule,
  deleteModule,
} from "@/services/moduleService";

export async function createModuleAction(formData: FormData) {
  const user = await getCurrentUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await createModule(user.id, { name });
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

export async function renameModuleAction(formData: FormData) {
  const user = await getCurrentUser();
  const moduleId = String(formData.get("moduleId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!moduleId || !name) return;

  await renameModule(user.id, moduleId, name);
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
