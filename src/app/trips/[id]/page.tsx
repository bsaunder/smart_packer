import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getTrip } from "@/services/tripService";
import { listModules } from "@/services/moduleService";
import { listCategories } from "@/services/categoryService";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { deleteTripAction } from "../actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  addCustomItemAction,
  addModulesToTripAction,
  createBagAction,
  deleteBagAction,
  updateBagAction,
} from "./actions";
import {
  allCategoriesOf,
  buildViewLink,
  groupTripItems,
  parseViewParams,
  visibleTripItems,
  type ViewParams,
} from "@/lib/packingListView";
import { formatDateRange } from "@/lib/formatDate";
import { PackingList } from "./packing-list";

export default async function TripDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<ViewParams>;
}) {
  const { id } = await params;
  const rawParams = await searchParams;
  const parsed = parseViewParams(rawParams);
  const { view, filter, scope, scopeType, scopeValue } = parsed;

  const user = await getCurrentUser();
  const [trip, modules, categories] = await Promise.all([
    getTrip(user.id, id),
    listModules(user.id),
    listCategories(user.id),
  ]);

  if (!trip) notFound();

  const dateRange = formatDateRange(trip.startDate, trip.endDate);
  const allCategories = allCategoriesOf(trip);
  const groups = groupTripItems(visibleTripItems(trip, parsed), view);
  const basePath = `/trips/${trip.id}`;

  const viewLink = (v: string) => buildViewLink(basePath, parsed, { view: v });
  const filterLink = (f: string) => buildViewLink(basePath, parsed, { filter: f });
  const scopeLink = (s: string) => buildViewLink(basePath, parsed, { scope: s });
  const printLink = buildViewLink(`${basePath}/print`, parsed, {});

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{trip.name}</h1>
          {(trip.destination || dateRange) && (
            <p className="text-muted-foreground">
              {[trip.destination, dateRange].filter(Boolean).join(" — ")}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/trips/${trip.id}/edit`}>Edit</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/trips/${trip.id}/duplicate`}>Duplicate</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={printLink}>Print</Link>
          </Button>
          <form action={deleteTripAction}>
            <input type="hidden" name="tripId" value={trip.id} />
            <ConfirmSubmitButton
              confirmMessage={`Delete trip "${trip.name}"? This permanently removes all its items and bags.`}
              variant="outline"
              className="text-destructive hover:text-destructive"
            >
              Delete
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex gap-2">
          <span className="text-muted-foreground">View:</span>
          <Link href={viewLink("category")} className={view === "category" ? "font-medium" : "text-muted-foreground"}>
            By Category
          </Link>
          <Link href={viewLink("bag")} className={view === "bag" ? "font-medium" : "text-muted-foreground"}>
            By Bag
          </Link>
        </div>
        <div className="flex gap-2">
          <span className="text-muted-foreground">Filter:</span>
          <Link href={filterLink("all")} className={filter === "all" ? "font-medium" : "text-muted-foreground"}>
            All
          </Link>
          <Link href={filterLink("packed")} className={filter === "packed" ? "font-medium" : "text-muted-foreground"}>
            Packed
          </Link>
          <Link href={filterLink("unpacked")} className={filter === "unpacked" ? "font-medium" : "text-muted-foreground"}>
            Unpacked
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-muted-foreground">Show:</span>
          <Link href={scopeLink("all")} className={scope === "all" ? "font-medium" : "text-muted-foreground"}>
            All
          </Link>
          {allCategories.map((c) => (
            <Link
              key={`cat-${c}`}
              href={scopeLink(`category:${c}`)}
              className={scopeType === "category" && scopeValue === c ? "font-medium" : "text-muted-foreground"}
            >
              {c}
            </Link>
          ))}
          {trip.bags.map((bag) => (
            <Link
              key={`bag-${bag.id}`}
              href={scopeLink(`bag:${bag.id}`)}
              className={scopeType === "bag" && scopeValue === bag.id ? "font-medium" : "text-muted-foreground"}
            >
              {bag.name}
            </Link>
          ))}
          {trip.bags.length > 0 && (
            <Link
              href={scopeLink("bag:unassigned")}
              className={scopeType === "bag" && scopeValue === "unassigned" ? "font-medium" : "text-muted-foreground"}
            >
              Unassigned
            </Link>
          )}
        </div>
      </div>

      <PackingList groups={[...groups.entries()]} bags={trip.bags} tripId={trip.id} />

      <div className="grid gap-6 sm:grid-cols-2">
        <form action={addCustomItemAction} className="flex flex-col gap-3 rounded-lg border p-4">
          <h3 className="font-medium">Add custom item</h3>
          <input type="hidden" name="tripId" value={trip.id} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category">Category</Label>
            <Input id="category" name="category" placeholder="Miscellaneous" list="category-options" />
            <datalist id="category-options">
              {categories.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quantity">Quantity</Label>
            <Input id="quantity" name="quantity" type="number" min={1} defaultValue={1} className="w-24" />
          </div>
          <Button type="submit" className="w-fit">
            Add item
          </Button>
        </form>

        {modules.length > 0 && (
          <form action={addModulesToTripAction} className="flex flex-col gap-3 rounded-lg border p-4">
            <h3 className="font-medium">Add modules to this trip</h3>
            <input type="hidden" name="tripId" value={trip.id} />
            <div className="flex flex-wrap gap-4">
              {modules.map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-sm">
                  <Checkbox name="moduleIds" value={m.id} />
                  {m.name}
                </label>
              ))}
            </div>
            <Button type="submit" className="w-fit" variant="secondary">
              Merge modules in
            </Button>
          </form>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <h3 className="font-medium">Bags</h3>
        {trip.bags.length > 0 && (
          <ul className="flex flex-col gap-2 text-sm">
            {trip.bags.map((bag) => (
              <li key={bag.id} className="flex flex-wrap items-end gap-2 border-b pb-2 last:border-b-0 last:pb-0">
                <form action={updateBagAction} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="bagId" value={bag.id} />
                  <input type="hidden" name="tripId" value={trip.id} />
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`bagName-${bag.id}`} className="text-xs">Name</Label>
                    <Input id={`bagName-${bag.id}`} name="name" defaultValue={bag.name} required className="h-8 w-40" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`bagType-${bag.id}`} className="text-xs">Type</Label>
                    <Input id={`bagType-${bag.id}`} name="bagType" defaultValue={bag.bagType ?? ""} className="h-8 w-28" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`bagColor-${bag.id}`} className="text-xs">Color</Label>
                    <Input id={`bagColor-${bag.id}`} name="color" defaultValue={bag.color ?? ""} className="h-8 w-24" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`bagWeight-${bag.id}`} className="text-xs">Weight limit</Label>
                    <Input
                      id={`bagWeight-${bag.id}`}
                      name="weightLimit"
                      type="number"
                      min={0}
                      step="0.1"
                      defaultValue={bag.weightLimit ?? ""}
                      className="h-8 w-24"
                    />
                  </div>
                  <Button type="submit" size="sm" variant="ghost">
                    Save
                  </Button>
                </form>
                <form action={deleteBagAction}>
                  <input type="hidden" name="bagId" value={bag.id} />
                  <input type="hidden" name="tripId" value={trip.id} />
                  <Button type="submit" size="sm" variant="ghost">
                    Delete
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={createBagAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="tripId" value={trip.id} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bagName">Name</Label>
            <Input id="bagName" name="name" placeholder="e.g. Checked Suitcase" required className="w-48" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bagType">Type</Label>
            <Input id="bagType" name="bagType" placeholder="optional" className="w-32" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bagColor">Color</Label>
            <Input id="bagColor" name="color" placeholder="optional" className="w-24" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="weightLimit">Weight limit</Label>
            <Input id="weightLimit" name="weightLimit" type="number" min={0} step="0.1" placeholder="optional" className="w-28" />
          </div>
          <Button type="submit" variant="secondary">
            Add bag
          </Button>
        </form>
      </div>
    </div>
  );
}
