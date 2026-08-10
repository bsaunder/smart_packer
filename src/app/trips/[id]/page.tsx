import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getTrip } from "@/services/tripService";
import { listModules } from "@/services/moduleService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "./actions";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const [trip, modules] = await Promise.all([
    getTrip(user.id, id),
    listModules(user.id),
  ]);

  if (!trip) notFound();

  const activeItems = trip.tripItems.filter((ti) => !ti.removed);
  const byCategory = new Map<string, typeof activeItems>();
  for (const item of activeItems) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{trip.name}</h1>
        {trip.destination && (
          <p className="text-muted-foreground">{trip.destination}</p>
        )}
      </div>

      {byCategory.size === 0 ? (
        <p className="text-muted-foreground">
          No items yet — generate this trip from a module, or add a custom
          item below.
        </p>
      ) : (
        [...byCategory.entries()].map(([category, categoryItems]) => (
          <div key={category} className="flex flex-col gap-2">
            <h2 className="text-lg font-medium">{category}</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Packed</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-32">Quantity</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryItems.map((item) => {
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
    </div>
  );
}
