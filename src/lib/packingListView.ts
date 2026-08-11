import type { getTrip } from "@/services/tripService";

type Trip = NonNullable<Awaited<ReturnType<typeof getTrip>>>;
export type TripItemRow = Trip["tripItems"][number];

export type ViewParams = { view?: string; filter?: string; scope?: string };

export type ParsedView = {
  view: "category" | "bag";
  filter: "all" | "packed" | "unpacked";
  scope: string;
  scopeType: "all" | "category" | "bag";
  scopeValue: string | null;
};

/** Shared by the interactive Packing List page and the print route (DESIGN.md "PackingListService"). */
export function parseViewParams(params: ViewParams): ParsedView {
  const view = params.view === "bag" ? "bag" : "category";
  const filter = params.filter === "packed" || params.filter === "unpacked" ? params.filter : "all";
  const scope = params.scope || "all";
  const scopeType = scope.startsWith("category:") ? "category" : scope.startsWith("bag:") ? "bag" : "all";
  const scopeValue = scopeType === "all" ? null : scope.slice(scope.indexOf(":") + 1);
  return { view, filter, scope, scopeType, scopeValue };
}

export function visibleTripItems(trip: Trip, parsed: ParsedView): TripItemRow[] {
  let items = trip.tripItems.filter((ti) => !ti.removed);
  if (parsed.filter === "packed") items = items.filter((ti) => ti.packed);
  if (parsed.filter === "unpacked") items = items.filter((ti) => !ti.packed);
  if (parsed.scopeType === "category") items = items.filter((ti) => ti.category === parsed.scopeValue);
  if (parsed.scopeType === "bag") {
    items =
      parsed.scopeValue === "unassigned"
        ? items.filter((ti) => !ti.bagId)
        : items.filter((ti) => ti.bagId === parsed.scopeValue);
  }
  return items;
}

export function groupTripItems(items: TripItemRow[], view: ParsedView["view"]): Map<string, TripItemRow[]> {
  const groups = new Map<string, TripItemRow[]>();
  for (const item of items) {
    const key = view === "bag" ? item.bag?.name ?? "Unassigned" : item.category;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
}

export function allCategoriesOf(trip: Trip): string[] {
  return [...new Set(trip.tripItems.filter((ti) => !ti.removed).map((ti) => ti.category))].sort();
}

export function buildViewLink(
  basePath: string,
  current: ParsedView,
  overrides: { view?: string; filter?: string; scope?: string }
): string {
  const v = overrides.view ?? current.view;
  const f = overrides.filter ?? current.filter;
  const s = overrides.scope ?? current.scope;
  const params = new URLSearchParams();
  if (v !== "category") params.set("view", v);
  if (f !== "all") params.set("filter", f);
  if (s !== "all") params.set("scope", s);
  const qs = params.toString();
  return `${basePath}${qs ? `?${qs}` : ""}`;
}
