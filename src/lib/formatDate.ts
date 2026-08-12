const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

export function formatDate(date: Date | null | undefined): string | null {
  return date ? formatter.format(date) : null;
}

export function formatDateRange(start: Date | null | undefined, end: Date | null | undefined): string | null {
  const s = formatDate(start);
  const e = formatDate(end);
  if (s && e) return `${s} – ${e}`;
  return s ?? e;
}

/** Value for an <input type="date">, e.g. "2026-08-15". */
export function toDateInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}
