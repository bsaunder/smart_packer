"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import type { TripItemRow } from "@/lib/packingListView";
import {
  togglePackedAction,
  updateQuantityAction,
  removeItemAction,
  assignBagAction,
  saveToMasterListAction,
} from "./actions";

const UNASSIGNED = "unassigned";

type Bag = { id: string; name: string };

export function PackingList({
  groups,
  bags,
  tripId,
}: {
  groups: [string, TripItemRow[]][];
  bags: Bag[];
  tripId: string;
}) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map(([name, items]) => [
        name,
        items.filter(
          (item) =>
            item.name.toLowerCase().includes(q) || (item.notes?.toLowerCase().includes(q) ?? false)
        ),
      ] as [string, TripItemRow[]])
      .filter(([, items]) => items.length > 0);
  }, [groups, search]);

  function toggleCollapsed(groupName: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Input
        type="search"
        placeholder="Search items…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {filteredGroups.length === 0 ? (
        <p className="text-muted-foreground">
          {search
            ? `No items match "${search}".`
            : "No items match — generate this trip from a module, add a custom item below, or adjust the filter above."}
        </p>
      ) : (
        filteredGroups.map(([groupName, groupItems]) => {
          const isCollapsed = collapsed.has(groupName);
          return (
            <div key={groupName} className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => toggleCollapsed(groupName)}
                className="flex items-center gap-1.5 text-lg font-medium"
              >
                {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                {groupName}
                <span className="text-sm font-normal text-muted-foreground">({groupItems.length})</span>
              </button>
              {!isCollapsed && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">Packed</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-32">Quantity</TableHead>
                      <TableHead className="w-40">Bag</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-36" />
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
                              <input type="hidden" name="tripId" value={tripId} />
                              <input type="hidden" name="packed" value={(!item.packed).toString()} />
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
                              <input type="hidden" name="tripId" value={tripId} />
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
                              <input type="hidden" name="tripId" value={tripId} />
                              <Select key={item.bagId ?? UNASSIGNED} name="bagId" defaultValue={item.bagId ?? UNASSIGNED}>
                                <SelectTrigger className="h-8 w-32">
                                  <SelectValue placeholder="Unassigned" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                                  {bags.map((bag) => (
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
                          <TableCell className="flex items-center gap-1">
                            {!item.sourceItemId && (
                              <form action={saveToMasterListAction}>
                                <input type="hidden" name="tripItemId" value={item.id} />
                                <input type="hidden" name="tripId" value={tripId} />
                                <Button type="submit" size="sm" variant="ghost" title="Save this item to your master Items list for reuse on future trips">
                                  Save to Items
                                </Button>
                              </form>
                            )}
                            <form action={removeItemAction}>
                              <input type="hidden" name="tripItemId" value={item.id} />
                              <input type="hidden" name="tripId" value={tripId} />
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
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
