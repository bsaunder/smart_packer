"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/session";
import { createUser, setUserActive, resetUserPassword } from "@/services/userService";
import { duplicateNameResult, type ActionResult } from "@/lib/errors";

export async function createUserAction(formData: FormData): Promise<ActionResult> {
  await getCurrentAdmin();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const isAdmin = formData.get("isAdmin") === "on";
  if (!username || !password) return;

  try {
    await createUser({ username, password, isAdmin });
  } catch (e) {
    return duplicateNameResult(e);
  }
  revalidatePath("/admin/users");
}

export async function setUserActiveAction(formData: FormData) {
  const admin = await getCurrentAdmin();
  const userId = String(formData.get("userId") ?? "");
  const active = formData.get("active") === "true";
  if (!userId) return;

  await setUserActive(admin.id, userId, active);
  revalidatePath("/admin/users");
}

export async function resetPasswordAction(formData: FormData) {
  await getCurrentAdmin();
  const userId = String(formData.get("userId") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  if (!userId || !newPassword) return;

  await resetUserPassword(userId, newPassword);
  revalidatePath("/admin/users");
}
