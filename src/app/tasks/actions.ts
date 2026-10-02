"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { userErrorResult, type ActionResult } from "@/lib/errors";
import { parseTiming } from "@/lib/taskTiming";
import { createTask, deleteTask, setTaskActive, updateTask } from "@/services/taskService";

const NO_PARENT = "none";

function taskInput(formData: FormData) {
  const timing = parseTiming(formData);
  const parentId = String(formData.get("parentId") ?? "");
  return {
    name: String(formData.get("name") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim() || null,
    parentId: parentId && parentId !== NO_PARENT ? parentId : null,
    timing,
  };
}

export async function createTaskAction(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  const { name, notes, parentId, timing } = taskInput(formData);
  if (!name) return;
  if (!timing) return { error: "Enter a whole number of days (0 or more)." };

  try {
    await createTask(user.id, { name, notes, parentId, ...timing });
  } catch (e) {
    return userErrorResult(e);
  }
  revalidatePath("/tasks");
}

export async function updateTaskAction(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  const taskId = String(formData.get("taskId") ?? "");
  const { name, notes, parentId, timing } = taskInput(formData);
  const active = formData.get("active") === "on";
  if (!taskId || !name) return;
  if (!timing) return { error: "Enter a whole number of days (0 or more)." };

  try {
    await updateTask(user.id, taskId, { name, notes, parentId, active, ...timing });
  } catch (e) {
    return userErrorResult(e);
  }
  revalidatePath("/tasks");
  redirect("/tasks");
}

export async function setTaskActiveAction(formData: FormData) {
  const user = await getCurrentUser();
  const taskId = String(formData.get("taskId") ?? "");
  if (!taskId) return;

  await setTaskActive(user.id, taskId, formData.get("active") === "true");
  revalidatePath("/tasks");
}

export async function deleteTaskAction(formData: FormData) {
  const user = await getCurrentUser();
  const taskId = String(formData.get("taskId") ?? "");
  if (!taskId) return;

  await deleteTask(user.id, taskId);
  revalidatePath("/tasks");
}
