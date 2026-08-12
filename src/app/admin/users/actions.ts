"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/session";
import { createUser, setUserActive, resetUserPassword } from "@/services/userService";

export async function createUserAction(formData: FormData) {
  await getCurrentAdmin();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const isAdmin = formData.get("isAdmin") === "on";
  if (!username || !password) return;

  await createUser({ username, password, isAdmin });
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
