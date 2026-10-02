"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { validateImport, commitImport, type ImportPreview, type ImportRowError } from "@/services/importService";
import { commitTaskImport, validateTaskImport, type TaskImportPreview } from "@/services/taskCsvService";

/** What the shared ImportForm shows: row errors, or human-readable summary lines. */
export type CsvImportResult = { errors: ImportRowError[]; summary: string[] };

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function itemsResult({ errors, summary: s }: ImportPreview): CsvImportResult {
  return {
    errors,
    summary: [
      `${plural(s.itemsToCreate, "item")} to create, ${s.itemsToUpdate} to update.`,
      ...(s.categoriesToCreate.length ? [`New categories: ${s.categoriesToCreate.join(", ")}`] : []),
      ...(s.modulesToCreate.length ? [`New modules: ${s.modulesToCreate.join(", ")}`] : []),
      ...(s.bagsToCreate.length ? [`New bags: ${s.bagsToCreate.join(", ")}`] : []),
    ],
  };
}

function tasksResult({ errors, summary: s }: TaskImportPreview): CsvImportResult {
  return {
    errors,
    summary: [
      `${plural(s.tasksToCreate, "task")} to create, ${s.tasksToUpdate} to update.`,
      ...(s.modulesToCreate.length ? [`New modules: ${s.modulesToCreate.join(", ")}`] : []),
    ],
  };
}

export async function previewItemsImportAction(csvText: string): Promise<CsvImportResult> {
  const user = await getCurrentUser();
  return itemsResult(await validateImport(user.id, csvText));
}

export async function commitItemsImportAction(csvText: string): Promise<CsvImportResult> {
  const user = await getCurrentUser();
  const result = await commitImport(user.id, csvText);
  if (result.errors.length === 0) {
    revalidatePath("/categories");
    revalidatePath("/items");
    revalidatePath("/modules");
    revalidatePath("/bags");
  }
  return itemsResult(result);
}

export async function previewTasksImportAction(csvText: string): Promise<CsvImportResult> {
  const user = await getCurrentUser();
  return tasksResult(await validateTaskImport(user.id, csvText));
}

export async function commitTasksImportAction(csvText: string): Promise<CsvImportResult> {
  const user = await getCurrentUser();
  const result = await commitTaskImport(user.id, csvText);
  if (result.errors.length === 0) {
    revalidatePath("/tasks");
    revalidatePath("/modules");
  }
  return tasksResult(result);
}
