/**
 * Task timing (DESIGN.md 1.12): a Task is due `offsetDays` before a Trip's
 * departure (startDate) or after its return (endDate, else startDate).
 * Shared by the Tasks pages, the Trip page, printing, and the Dashboard.
 */

export type Anchor = "DEPARTURE" | "RETURN";

/** Preset choices offered in the "When" picker; any other day count is "custom". */
export const TIMING_PRESETS: Record<Anchor, { days: number; label: string }[]> = {
  DEPARTURE: [
    { days: 0, label: "Day of departure" },
    { days: 1, label: "Day before departure" },
    { days: 7, label: "Week before departure" },
    { days: 14, label: "2 weeks before departure" },
    { days: 28, label: "4 weeks before departure" },
    { days: 90, label: "3 months before departure" },
  ],
  RETURN: [
    { days: 0, label: "Day of return" },
    { days: 1, label: "Day after return" },
    { days: 7, label: "Week after return" },
  ],
};

/** Group heading for a timing, e.g. 7 → "Week Before Departure", 90 → "3 Months Before Departure". */
export function timingLabel(anchor: Anchor, days: number): string {
  const departure = anchor === "DEPARTURE";
  const relation = departure ? "Before Departure" : "After Return";
  if (days === 0) return departure ? "Day Of Departure" : "Day Of Return";
  if (days === 1) return departure ? "Day Before Departure" : "Day After Return";
  if (days === 7) return `Week ${relation}`;
  if (days % 30 === 0) return `${days / 30} Month${days === 30 ? "" : "s"} ${relation}`;
  if (days % 7 === 0) return `${days / 7} Weeks ${relation}`;
  return `${days} Days ${relation}`;
}

/** The date a task is due on this trip, or null when the trip has no date to anchor to. */
export function dueDate(
  trip: { startDate: Date | null; endDate: Date | null },
  anchor: Anchor,
  days: number
): Date | null {
  const base = anchor === "DEPARTURE" ? trip.startDate : (trip.endDate ?? trip.startDate);
  if (!base) return null;
  const due = new Date(base);
  due.setDate(due.getDate() + (anchor === "DEPARTURE" ? -days : days));
  return due;
}

/** Midnight today in the server's timezone (TZ), for overdue / due-soon comparisons. */
export function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

type TaskLike = {
  id: string;
  parentId: string | null;
  name: string;
  anchor: Anchor;
  offsetDays: number;
};

export type TaskGroup<T> = {
  label: string;
  days: number;
  /** `parentName` is set on a sub-task listed on its own because its timing differs from its parent's. */
  tasks: { task: T; children: T[]; parentName?: string }[];
};

/**
 * Groups one anchor's tasks by timing, in the order they happen: earliest
 * first (3 months before → day of departure; day of → week after return).
 * Sub-tasks are listed under their parent when they share its timing; a
 * sub-task due at a different time is listed in its own timeframe group
 * (with `parentName` for context), as is one whose parent isn't in `tasks`.
 */
export function groupTasks<T extends TaskLike>(tasks: T[], anchor: Anchor): TaskGroup<T>[] {
  const own = tasks.filter((t) => t.anchor === anchor);
  const byId = new Map(own.map((t) => [t.id, t]));
  const nestedUnder = (t: T) => {
    const parent = t.parentId ? byId.get(t.parentId) : undefined;
    return parent && parent.offsetDays === t.offsetDays ? parent : undefined;
  };
  const childrenOf = new Map<string, T[]>();
  for (const t of own) {
    const parent = nestedUnder(t);
    if (parent) childrenOf.set(parent.id, [...(childrenOf.get(parent.id) ?? []), t]);
  }

  const groups = new Map<number, TaskGroup<T>>();
  for (const t of own) {
    if (nestedUnder(t)) continue;
    const group = groups.get(t.offsetDays) ?? { label: timingLabel(anchor, t.offsetDays), days: t.offsetDays, tasks: [] };
    const parentName = t.parentId ? byId.get(t.parentId)?.name : undefined;
    group.tasks.push({ task: t, children: (childrenOf.get(t.id) ?? []).sort(byName), parentName });
    groups.set(t.offsetDays, group);
  }
  for (const g of groups.values()) g.tasks.sort((a, b) => byName(a.task, b.task));

  return [...groups.values()].sort((a, b) => (anchor === "DEPARTURE" ? b.days - a.days : a.days - b.days));
}

function byName(a: { name: string }, b: { name: string }) {
  return a.name.localeCompare(b.name);
}

/** Reads the TimingFields inputs: `timing` (preset days, "custom", or "inherit") + `customDays`. */
export function parseTiming(formData: FormData): { anchor: Anchor; offsetDays: number | null } | null {
  const anchor: Anchor = formData.get("anchor") === "RETURN" ? "RETURN" : "DEPARTURE";
  const timing = String(formData.get("timing") ?? "");
  if (timing === "inherit") return { anchor, offsetDays: null };
  const raw = timing === "custom" ? String(formData.get("customDays") ?? "") : timing;
  const days = Number(raw);
  if (raw.trim() === "" || !Number.isInteger(days) || days < 0) return null;
  return { anchor, offsetDays: days };
}
