/**
 * Shared row shape for the Items CSV used by both ImportService and
 * ExportService (DESIGN.md "Data Import & Export (CSV)"). Keeping both
 * directions against one column list is what makes export/import round-trip.
 */
export const CSV_COLUMNS = [
  "name",
  "category",
  "default_quantity",
  "notes",
  "active",
  "modules",
  "children",
  "default_bag",
] as const;

export const MULTI_VALUE_SEPARATOR = "|";
