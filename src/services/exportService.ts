import { stringify } from "csv-stringify/sync";
import { prisma } from "@/lib/prisma";
import { CSV_COLUMNS, MULTI_VALUE_SEPARATOR } from "@/services/csvSchema";

/**
 * Serializes a user's master data (Categories, Items with parent/child
 * links, Modules with membership) to the same Items CSV shape used for
 * import (DESIGN.md "Data Import & Export (CSV)"). Trip-level data is out
 * of scope, same as import.
 */
export async function exportItemsCsv(ownerId: string): Promise<string> {
  const items = await prisma.item.findMany({
    where: { ownerId },
    include: {
      category: true,
      moduleItems: { include: { module: true } },
      childLinks: { include: { childItem: true } },
    },
    orderBy: { name: "asc" },
  });

  const records = items.map((item) => ({
    name: item.name,
    category: item.category.name,
    default_quantity: String(item.defaultQuantity),
    notes: item.notes ?? "",
    active: item.active ? "true" : "false",
    modules: item.moduleItems.map((mi) => mi.module.name).join(MULTI_VALUE_SEPARATOR),
    children: item.childLinks.map((cl) => cl.childItem.name).join(MULTI_VALUE_SEPARATOR),
  }));

  return stringify(records, { header: true, columns: [...CSV_COLUMNS] });
}
