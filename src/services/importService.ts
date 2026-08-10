import { parse } from "csv-parse/sync";
import { prisma } from "@/lib/prisma";
import { MULTI_VALUE_SEPARATOR } from "@/services/csvSchema";

export type ImportRowError = { row: number; message: string };

export type ImportSummary = {
  categoriesToCreate: string[];
  modulesToCreate: string[];
  itemsToCreate: number;
  itemsToUpdate: number;
};

export type ImportPreview = {
  errors: ImportRowError[];
  summary: ImportSummary;
};

type ParsedRow = {
  row: number; // 1-based, counting the header as row 0 (matches spreadsheet line numbers)
  name: string;
  category: string;
  defaultQuantity: number;
  notes: string | null;
  active: boolean;
  modules: string[];
  children: string[];
};

function splitMultiValue(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(MULTI_VALUE_SEPARATOR)
    .map((v) => v.trim())
    .filter(Boolean);
}

/**
 * Parses the raw CSV text into rows plus file-level/row-level errors. Does
 * not touch the database — pure parsing + per-row shape validation.
 */
function parseRows(csvText: string): { rows: ParsedRow[]; errors: ImportRowError[] } {
  const errors: ImportRowError[] = [];

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

  if (records.length === 0) {
    return { rows: [], errors: [{ row: 0, message: "CSV file has no data rows." }] };
  }

  const header = Object.keys(records[0]);
  if (!header.includes("name") || !header.includes("category")) {
    errors.push({ row: 0, message: "CSV must have \"name\" and \"category\" columns." });
    return { rows: [], errors };
  }

  const rows: ParsedRow[] = [];

  records.forEach((record, i) => {
    const rowNum = i + 2; // +1 for header, +1 for 1-based
    const name = (record.name ?? "").trim();
    const category = (record.category ?? "").trim();

    if (!name) errors.push({ row: rowNum, message: "\"name\" is required." });
    if (!category) errors.push({ row: rowNum, message: "\"category\" is required." });

    let defaultQuantity = 1;
    const rawQty = (record.default_quantity ?? "").trim();
    if (rawQty) {
      const parsed = Number(rawQty);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        errors.push({ row: rowNum, message: `"default_quantity" must be a positive integer, got "${rawQty}".` });
      } else {
        defaultQuantity = parsed;
      }
    }

    let active = true;
    const rawActive = (record.active ?? "").trim().toLowerCase();
    if (rawActive) {
      if (rawActive === "true") active = true;
      else if (rawActive === "false") active = false;
      else errors.push({ row: rowNum, message: `"active" must be "true" or "false", got "${rawActive}".` });
    }

    if (!name || !category) return; // can't usefully carry this row further

    rows.push({
      row: rowNum,
      name,
      category,
      defaultQuantity,
      notes: (record.notes ?? "").trim() || null,
      active,
      modules: splitMultiValue(record.modules),
      children: splitMultiValue(record.children),
    });
  });

  return { rows, errors };
}

/** Cycle detection over name-keyed adjacency (DFS with a recursion stack). */
function findCycleMembers(adjacency: Map<string, Set<string>>): Set<string> {
  const WHITE = 0,
    GRAY = 1,
    BLACK = 2;
  const color = new Map<string, number>();
  const cycleNodes = new Set<string>();

  function visit(node: string, stack: string[]) {
    color.set(node, GRAY);
    stack.push(node);

    for (const next of adjacency.get(node) ?? []) {
      const c = color.get(next) ?? WHITE;
      if (c === WHITE) {
        visit(next, stack);
      } else if (c === GRAY) {
        const cycleStart = stack.indexOf(next);
        for (const n of stack.slice(cycleStart)) cycleNodes.add(n);
      }
    }

    stack.pop();
    color.set(node, BLACK);
  }

  for (const node of adjacency.keys()) {
    if ((color.get(node) ?? WHITE) === WHITE) visit(node, []);
  }

  return cycleNodes;
}

async function buildPreview(ownerId: string, rows: ParsedRow[], parseErrors: ImportRowError[]): Promise<ImportPreview> {
  const errors = [...parseErrors];

  const nameCounts = new Map<string, number[]>();
  for (const r of rows) {
    nameCounts.set(r.name, [...(nameCounts.get(r.name) ?? []), r.row]);
  }
  for (const [name, occurrences] of nameCounts) {
    if (occurrences.length > 1) {
      for (const row of occurrences) {
        errors.push({ row, message: `Duplicate item name "${name}" also appears on row(s) ${occurrences.filter((r) => r !== row).join(", ")}.` });
      }
    }
  }

  const fileNames = new Set(rows.map((r) => r.name));

  // A `children` reference may resolve against another row in this file or
  // an Item that already exists in the database for this owner (1.5) — it
  // no longer has to appear as its own row in every import.
  const existingItems = await prisma.item.findMany({
    where: { ownerId },
    select: { id: true, name: true },
  });
  const idToName = new Map(existingItems.map((i) => [i.id, i.name]));
  const existingNames = new Set(existingItems.map((i) => i.name));
  const knownNames = new Set([...fileNames, ...existingNames]);

  for (const r of rows) {
    if (r.children.includes(r.name)) {
      errors.push({ row: r.row, message: `"${r.name}" cannot be its own child.` });
    }
    for (const child of r.children) {
      if (!knownNames.has(child)) {
        errors.push({ row: r.row, message: `child "${child}" has no row of its own in this file, and no Item named "${child}" exists yet.` });
      }
    }
  }

  // Combine existing DB parent/child edges (by name) with the edges implied
  // by this file, then check the resulting graph for cycles.
  const existingEdges = await prisma.itemParentChild.findMany({
    where: { parentItem: { ownerId } },
    select: { parentItemId: true, childItemId: true },
  });

  const adjacency = new Map<string, Set<string>>();
  const addEdge = (parent: string, child: string) => {
    if (!adjacency.has(parent)) adjacency.set(parent, new Set());
    adjacency.get(parent)!.add(child);
    if (!adjacency.has(child)) adjacency.set(child, new Set());
  };
  for (const e of existingEdges) {
    const parentName = idToName.get(e.parentItemId);
    const childName = idToName.get(e.childItemId);
    if (parentName && childName) addEdge(parentName, childName);
  }
  for (const r of rows) {
    for (const child of r.children) {
      if (knownNames.has(child)) addEdge(r.name, child);
    }
  }

  const cycleMembers = findCycleMembers(adjacency);
  if (cycleMembers.size > 0) {
    for (const r of rows) {
      if (cycleMembers.has(r.name)) {
        errors.push({ row: r.row, message: `"${r.name}" is part of a parent/child cycle.` });
      }
    }
  }

  const existingCategories = new Set(
    (await prisma.category.findMany({ where: { ownerId }, select: { name: true } })).map((c) => c.name)
  );
  const existingModules = new Set(
    (await prisma.module.findMany({ where: { ownerId }, select: { name: true } })).map((m) => m.name)
  );

  const categoriesToCreate = new Set<string>();
  const modulesToCreate = new Set<string>();
  let itemsToCreate = 0;
  let itemsToUpdate = 0;

  for (const r of rows) {
    if (!existingCategories.has(r.category)) categoriesToCreate.add(r.category);
    for (const m of r.modules) if (!existingModules.has(m)) modulesToCreate.add(m);
    if (existingNames.has(r.name)) itemsToUpdate++;
    else itemsToCreate++;
  }

  return {
    errors,
    summary: {
      categoriesToCreate: [...categoriesToCreate],
      modulesToCreate: [...modulesToCreate],
      itemsToCreate,
      itemsToUpdate,
    },
  };
}

export async function validateImport(ownerId: string, csvText: string): Promise<ImportPreview> {
  const { rows, errors } = parseRows(csvText);
  return buildPreview(ownerId, rows, errors);
}

/**
 * Commits the import in a single transaction, scoped to the owner
 * (FR-054, FR-055). Re-validates first and refuses to write anything if
 * any row fails validation (all-or-nothing).
 */
export async function commitImport(ownerId: string, csvText: string): Promise<ImportPreview> {
  const { rows, errors: parseErrors } = parseRows(csvText);
  const preview = await buildPreview(ownerId, rows, parseErrors);
  if (preview.errors.length > 0) return preview;

  await prisma.$transaction(async (tx) => {
    // Pass 1: categories, items (upsert by name), module memberships (merged/union).
    const categoryIdByName = new Map<string, string>();
    for (const cat of await tx.category.findMany({ where: { ownerId }, select: { id: true, name: true } })) {
      categoryIdByName.set(cat.name, cat.id);
    }
    const moduleIdByName = new Map<string, string>();
    for (const mod of await tx.module.findMany({ where: { ownerId }, select: { id: true, name: true } })) {
      moduleIdByName.set(mod.name, mod.id);
    }

    async function ensureCategory(name: string) {
      const existing = categoryIdByName.get(name);
      if (existing) return existing;
      const last = await tx.category.findFirst({ where: { ownerId }, orderBy: { sortOrder: "desc" } });
      const created = await tx.category.create({
        data: { ownerId, name, sortOrder: (last?.sortOrder ?? -1) + 1 },
      });
      categoryIdByName.set(name, created.id);
      return created.id;
    }

    async function ensureModule(name: string) {
      const existing = moduleIdByName.get(name);
      if (existing) return existing;
      const created = await tx.module.create({ data: { ownerId, name } });
      moduleIdByName.set(name, created.id);
      return created.id;
    }

    const itemIdByName = new Map<string, string>();

    for (const r of rows) {
      const categoryId = await ensureCategory(r.category);

      const item = await tx.item.upsert({
        where: { ownerId_name: { ownerId, name: r.name } },
        create: {
          ownerId,
          name: r.name,
          categoryId,
          defaultQuantity: r.defaultQuantity,
          notes: r.notes,
          active: r.active,
        },
        update: {
          categoryId,
          defaultQuantity: r.defaultQuantity,
          notes: r.notes,
          active: r.active,
        },
      });
      itemIdByName.set(r.name, item.id);

      for (const moduleName of r.modules) {
        const moduleId = await ensureModule(moduleName);
        await tx.moduleItem.upsert({
          where: { moduleId_itemId: { moduleId, itemId: item.id } },
          create: { moduleId, itemId: item.id },
          update: {},
        });
      }
    }

    // Pass 2: wire parent/child relationships (merged/union with existing).
    // A child may be a row in this file, or an Item that already existed
    // before this import (1.5) — resolve against both.
    const existingItemIdByName = new Map<string, string>();
    for (const item of await tx.item.findMany({ where: { ownerId }, select: { id: true, name: true } })) {
      existingItemIdByName.set(item.name, item.id);
    }

    for (const r of rows) {
      const parentId = itemIdByName.get(r.name)!;
      for (const childName of r.children) {
        const childId = itemIdByName.get(childName) ?? existingItemIdByName.get(childName);
        if (!childId) continue; // unresolved refs were already rejected in validation
        await tx.itemParentChild.upsert({
          where: { parentItemId_childItemId: { parentItemId: parentId, childItemId: childId } },
          create: { parentItemId: parentId, childItemId: childId },
          update: {},
        });
      }
    }

    // Invariant: a child of a parent that belongs to a Module also belongs
    // to that Module (FR-054). Chains of parent/child can be more than one
    // level deep (A -> B -> C), so propagate to a fixed point: keep making
    // passes until one adds no new memberships, bounded by the number of
    // touched items as a safe upper limit on chain length.
    const touchedIds = [...itemIdByName.values()];
    for (let pass = 0; pass < touchedIds.length + 1; pass++) {
      const edges = await tx.itemParentChild.findMany({
        where: { parentItemId: { in: touchedIds } },
        select: { parentItemId: true, childItemId: true },
      });
      let changed = false;
      for (const { parentItemId, childItemId } of edges) {
        const parentModules = await tx.moduleItem.findMany({
          where: { itemId: parentItemId },
          select: { moduleId: true },
        });
        for (const { moduleId } of parentModules) {
          const existing = await tx.moduleItem.findUnique({
            where: { moduleId_itemId: { moduleId, itemId: childItemId } },
          });
          if (!existing) {
            await tx.moduleItem.create({ data: { moduleId, itemId: childItemId } });
            changed = true;
          }
        }
      }
      if (!changed) break;
    }
  });

  return preview;
}
