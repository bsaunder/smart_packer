import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getTrip } from "@/services/tripService";
import { listModules } from "@/services/moduleService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  togglePackedAction,
  updateQuantityAction,
  removeItemAction,
  addCustomItemAction,
  addModulesToTripAction,
  assignBagAction,
  createBagAction,
  deleteBagAction,
} from "./actions";

const UNASSIGNED = "unassigned";

export default async function TripDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string; filter?: string }>;
}) {
  const { id } = await params;
  const { view: rawView, filter: rawFilter } = await searchParams;
  const view = rawView === "bag" ? "bag" : "category";
  const filter = rawFilter === "packed" || rawFilter === "unpacked" ? rawFilter : "all";

  const user = await getCurrentUser();
  const [trip, modules] = await Promise.all([
    getTrip(user.id, id),
    listModules(user.id),
  ]);

  if (!trip) notFound();

  let visibleItems = trip.tripItems.filter((ti) => !ti.removed);
  if (filter === "packed") visibleItems = visibleItems.filter((ti) => ti.packed);
  if (filter === "unpacked") visibleItems = visibleItems.filter((ti) => !ti.packed);

  const groups = new Map<string, typeof visibleItems>();
  if (view === "bag") {
    for (const item of visibleItems) {
      const key = item.bag?.name ?? "Unassigned";
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }
  } else {
    for (const item of visibleItems) {
      groups.set(item.category, [...(groups.get(item.category) ?? []), item]);
    }
  }

  function viewLink(v: string) {
    const params = new URLSearchParams();
    if (v !== "category") params.set("view", v);
    if (filter !== "all") params.set("filter", filter);
    const qs = params.toString();
    return `/trips/${trip!.id}${qs ? `?${qs}` : ""}`;
  }

  function filterLink(f: string) {
    const params = new URLSearchParams();
    if (view !== "category") params.set("view", view);
    if (f !== "all") params.set("filter", f);
    const qs = params.toString();
    return `/trips/${trip!.id}${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{trip.name}</h1>
        {trip.destination && (
          <p className="text-muted-foreground">{trip.destination}</p>
        )}
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
      </div>

      {groups.size === 0 ? (
        <p className="text-muted-foreground">
          No items match — generate this trip from a module, add a custom
          item below, or adjust the filter above.
        </p>
      ) : (
        [...groups.entries()].map(([groupName, groupItems]) => (
          <div key={groupName} className="flex flex-col gap-2">
            <h2 className="text-lg font-medium">{groupName}</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Packed</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-32">Quantity</TableHead>
                  <TableHead className="w-40">Bag</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupItems.map((item) => {
                  const quantity = item.quantityOverride ?? item.quantity;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <form action={togglePackedAction}>
                          <input type="hidden" name="tripItemId" value={item.id} />
                          <input type="hidden" name="tripId" value={trip.id} />
                          <input
                            type="hidden"
                            name="packed"
                            value={(!item.packed).toString()}
                          />
                          <Button
                            type="submit"
                            size="sm"
                            variant={item.packed ? "default" : "outline"}
                            aria-pressed={item.packed}
                          >
                            {item.packed ? "Packed" : "Pack"}
                          </Button>
                        </form>
                      </TableCell>
                      <TableCell className={item.packed ? "text-muted-foreground line-through" : ""}>
                        {item.name}
                      </TableCell>
                      <TableCell>
                        <form action={updateQuantityAction} className="flex items-center gap-2">
                          <input type="hidden" name="tripItemId" value={item.id} />
                          <input type="hidden" name="tripId" value={trip.id} />
                          <Input
                            name="quantity"
                            type="number"
                            min={0}
                            defaultValue={quantity}
                            className="h-8 w-16"
                          />
                          <Button type="submit" size="sm" variant="ghost">
                            Set
                          </Button>
                        </form>
                      </TableCell>
                      <TableCell>
                        <form action={assignBagAction} className="flex items-center gap-2">
                          <input type="hidden" name="tripItemId" value={item.id} />
                          <input type="hidden" name="tripId" value={trip.id} />
                          <Select name="bagId" defaultValue={item.bagId ?? UNASSIGNED}>
                            <SelectTrigger className="h-8 w-32">
                              <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                              {trip.bags.map((bag) => (
                                <SelectItem key={bag.id} value={bag.id}>
                                  {bag.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button type="submit" size="sm" variant="ghost">
                            Set
                          </Button>
                        </form>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.notes}</TableCell>
                      <TableCell>
                        <form action={removeItemAction}>
                          <input type="hidden" name="tripItemId" value={item.id} />
                          <input type="hidden" name="tripId" value={trip.id} />
                          <Button type="submit" size="sm" variant="ghost">
                            Remove
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ))
      )}

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
            <Input id="category" name="category" placeholder="Miscellaneous" />
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
          <ul className="flex flex-col gap-1 text-sm">
            {trip.bags.map((bag) => (
              <li key={bag.id} className="flex items-center gap-3">
                <span>
                  {bag.name}
                  {bag.bagType ? ` (${bag.bagType})` : ""}
                  {bag.weightLimit ? ` — limit ${bag.weightLimit}` : ""}
                </span>
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
