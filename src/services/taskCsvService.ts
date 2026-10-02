import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { prisma } from "@/lib/prisma";
import { MULTI_VALUE_SEPARATOR } from "@/services/csvSchema";
import type { ImportRowError } from "@/services/importService";
import type { Anchor } from "@/lib/taskTiming";

/**
 * The Tasks CSV (DESIGN.md 1.12): one row per master Task, separate from the
 * Items CSV. Same conventions as the Items CSV — header row, columns matched
 * by name, `|`-separated multi-values, upsert by name, whole file validated
 * before anything is written, and additive (blank cells never clear data).
 */
export const TASK_CSV_COLUMNS = ["name", "days", "relative_to", "parent", "modules", "notes", "active"] as const;

export type TaskImportPreview = {
  errors: ImportRowError[];
  summary: { tasksToCreate: number; tasksToUpdate: number; modulesToCreate: string[] };
};

type Row = {
  row: number;
  name: string;
  /** Null: blank — inherit from parent (sub-task) or leave an existing task's timing unchanged. */
  days: number | null;
  anchor: Anchor | null;
  parent: string | null;
  modules: string[];
  notes: string | null;
  active: boolean | null;
};

export async function exportTasksCsv(ownerId: string): Promise<string> {
  const tasks = await prisma.task.findMany({
    where: { ownerId },
    include: { parent: true, moduleTasks: { include: { module: true } } },
    orderBy: { name: "asc" },
  });
  // Parents before sub-tasks, so the file reads top-down.
  tasks.sort((a, b) => Number(!!a.parentId) - Number(!!b.parentId));

  const records = tasks.map((t) => ({
    name: t.name,
    days: t.offsetDays === null ? "" : String(t.offsetDays),
    relative_to: t.parentId ? "" : t.anchor === "RETURN" ? "return" : "departure",
    parent: t.parent?.name ?? "",
    modules: t.moduleTasks.map((mt) => mt.module.name).join(MULTI_VALUE_SEPARATOR),
    notes: t.notes ?? "",
    active: t.active ? "true" : "false",
  }));
  return stringify(records, { header: true, columns: [...TASK_CSV_COLUMNS] });
}

function parseRows(csvText: string): { rows: Row[]; errors: ImportRowError[] } {
  let records: Record<string, string>[];
  try {
    records = parse(csvText, {
      columns: (header: string[]) => header.map((h) => h.trim().toLowerCase()),
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
  } catch (e) {
    return { rows: [], errors: [{ row: 0, message: `Could not parse CSV: ${(e as Error).message}` }] };
  }
  if (records.length === 0) return { rows: [], errors: [{ row: 0, message: "CSV file has no data rows." }] };
  if (!Object.keys(records[0]).includes("name")) {
    return { rows: [], errors: [{ row: 0, message: 'CSV must have a "name" column.' }] };
  }

  const errors: ImportRowError[] = [];
  const rows: Row[] = [];
  records.forEach((r, i) => {
    const row = i + 2;
    const name = (r.name ?? "").trim();
    if (!name) {
      errors.push({ row, message: '"name" is required.' });
      return;
    }

    let days: number | null = null;
    const rawDays = (r.days ?? "").trim();
    if (rawDays) {
      const n = Number(rawDays);
      if (!Number.isInteger(n) || n < 0) errors.push({ row, message: `"days" must be a whole number (0 or more), got "${rawDays}".` });
      else days = n;
    }

    let anchor: Anchor | null = null;
    const rawAnchor = (r.relative_to ?? "").trim().toLowerCase();
    if (rawAnchor === "departure") anchor = "DEPARTURE";
    else if (rawAnchor === "return") anchor = "RETURN";
    else if (rawAnchor) errors.push({ row, message: `"relative_to" must be "departure" or "return", got "${rawAnchor}".` });

    let active: boolean | null = null;
    const rawActive = (r.active ?? "").trim().toLowerCase();
    if (rawActive === "true") active = true;
    else if (rawActive === "false") active = false;
    else if (rawActive) errors.push({ row, message: `"active" must be "true" or "false", got "${rawActive}".` });

    rows.push({
      row,
      name,
      days,
      anchor,
      parent: (r.parent ?? "").trim() || null,
      modules: (r.modules ?? "").split(MULTI_VALUE_SEPARATOR).map((m) => m.trim()).filter(Boolean),
      notes: (r.notes ?? "").trim() || null,
      active,
    });
  });
  return { rows, errors };
}

async function buildPreview(ownerId: string, rows: Row[], parseErrors: ImportRowError[]): Promise<TaskImportPreview> {
  const errors = [...parseErrors];

  const seen = new Map<string, number>();
  for (const r of rows) {
    const first = seen.get(r.name);
    if (first) errors.push({ row: r.row, message: `Duplicate task name "${r.name}" (also on row ${first}).` });
    else seen.set(r.name, r.row);
  }

  const existing = await prisma.task.findMany({
    where: { ownerId },
    select: { name: true, parentId: true, offsetDays: true, _count: { select: { children: true } } },
  });
  const existingByName = new Map(existing.map((t) => [t.name, t]));
  const rowByName = new Map(rows.map((r) => [r.name, r]));

  // A row's parent after import: its own `parent` cell, else (blank) whatever it already has.
  const willBeSubTask = (name: string) => {
    const r = rowByName.get(name);
    if (r?.parent) return true;
    return !!existingByName.get(name)?.parentId;
  };

  for (const r of rows) {
    const existingTask = existingByName.get(r.name);
    if (r.parent) {
      if (r.parent === r.name) {
        errors.push({ row: r.row, message: `"${r.name}" can't be its own parent.` });
      } else if (!rowByName.has(r.parent) && !existingByName.has(r.parent)) {
        errors.push({ row: r.row, message: `parent "${r.parent}" has no row in this file and no task by that name exists.` });
      } else if (willBeSubTask(r.parent)) {
        errors.push({ row: r.row, message: `parent "${r.parent}" is itself a sub-task. Sub-tasks can only go one level deep.` });
      }
      const hasChildren = rows.some((o) => o.parent === r.name) || (existingTask?._count.children ?? 0) > 0;
      if (hasChildren) errors.push({ row: r.row, message: `"${r.name}" has sub-tasks of its own, so it can't be a sub-task.` });
    } else if (r.days === null && !existingTask) {
      errors.push({ row: r.row, message: `"days" is required for a new top-level task.` });
    }
  }

  const existingModules = new Set(
    (await prisma.module.findMany({ where: { ownerId }, select: { name: true } })).map((m) => m.name)
  );
  const modulesToCreate = [...new Set(rows.flatMap((r) => r.modules).filter((m) => !existingModules.has(m)))];

  return {
    errors,
    summary: {
      tasksToCreate: rows.filter((r) => !existingByName.has(r.name)).length,
      tasksToUpdate: rows.filter((r) => existingByName.has(r.name)).length,
      modulesToCreate,
    },
  };
}

export async function validateTaskImport(ownerId: string, csvText: string) {
  const { rows, errors } = parseRows(csvText);
  return buildPreview(ownerId, rows, errors);
}

/** Commits in one transaction after re-validating; writes nothing if any row fails (all-or-nothing). */
export async function commitTaskImport(ownerId: string, csvText: string) {
  const { rows, errors } = parseRows(csvText);
  const preview = await buildPreview(ownerId, rows, errors);
  if (preview.errors.length > 0) return preview;

  await prisma.$transaction(async (tx) => {
    // Pass 1: upsert every task's own fields (blank cells leave existing values alone).
    const idByName = new Map<string, string>();
    for (const r of rows) {
      const task = await tx.task.upsert({
        where: { ownerId_name: { ownerId, name: r.name } },
        create: {
          ownerId,
          name: r.name,
          offsetDays: r.days,
          anchor: r.anchor ?? "DEPARTURE",
          notes: r.notes,
          active: r.active ?? true,
        },
        update: {
          ...(r.days !== null && { offsetDays: r.days }),
          ...(r.anchor && { anchor: r.anchor }),
          ...(r.notes && { notes: r.notes }),
          ...(r.active !== null && { active: r.active }),
        },
      });
      idByName.set(r.name, task.id);
    }

    // Pass 2: parent links (a sub-task follows its parent's anchor), then modules (union).
    for (const r of rows) {
      if (r.parent) {
        const parent = await tx.task.findUniqueOrThrow({ where: { ownerId_name: { ownerId, name: r.parent } } });
        await tx.task.update({ where: { id: idByName.get(r.name)! }, data: { parentId: parent.id, anchor: parent.anchor } });
      }
    }
    // A top-level row may have changed its anchor: existing sub-tasks follow it.
    for (const r of rows) {
      if (r.parent || !r.anchor) continue;
      await tx.task.updateMany({ where: { parentId: idByName.get(r.name)! }, data: { anchor: r.anchor } });
    }
    for (const r of rows) {
      for (const moduleName of r.modules) {
        const mod = await tx.module.upsert({
          where: { ownerId_name: { ownerId, name: moduleName } },
          create: { ownerId, name: moduleName },
          update: {},
        });
        await tx.moduleTask.upsert({
          where: { moduleId_taskId: { moduleId: mod.id, taskId: idByName.get(r.name)! } },
          create: { moduleId: mod.id, taskId: idByName.get(r.name)! },
          update: {},
        });
      }
    }
  });

  return preview;
}
