"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { ActionForm } from "@/components/action-form";
import { deleteBagAction, setBagActiveAction, updateBagAction } from "./actions";

type Bag = {
  id: string;
  name: string;
  bagType: string | null;
  color: string | null;
  weightLimit: number | null;
  active: boolean;
  _count: { items: number };
};

export function BagsTable({ bags }: { bags: Bag[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bags;
    return bags.filter((b) =>
      [b.name, b.bagType, b.color].some((v) => v?.toLowerCase().includes(q))
    );
  }, [bags, search]);

  return (
    <div className="flex flex-col gap-4">
      <Input
        type="search"
        placeholder="Search bags…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Bag</TableHead>
            <TableHead className="text-right">Default for</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((bag) => (
            <TableRow key={bag.id} className={bag.active ? "" : "text-muted-foreground"}>
              <TableCell>
                <ActionForm action={updateBagAction} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="bagId" value={bag.id} />
                  <Input name="name" defaultValue={bag.name} required aria-label="Name" className="h-8 w-44" />
                  <Input name="bagType" defaultValue={bag.bagType ?? ""} placeholder="Type" aria-label="Type" className="h-8 w-28" />
                  <Input name="color" defaultValue={bag.color ?? ""} placeholder="Color" aria-label="Color" className="h-8 w-24" />
                  <Input
                    name="weightLimit"
                    type="number"
                    min={0}
                    step="0.1"
                    defaultValue={bag.weightLimit ?? ""}
                    placeholder="Weight limit"
                    aria-label="Weight limit"
                    className="h-8 w-28"
                  />
                  <Button type="submit" size="sm" variant="ghost">
                    Save
                  </Button>
                </ActionForm>
              </TableCell>
              <TableCell className="text-right">
                {bag._count.items} item{bag._count.items === 1 ? "" : "s"}
              </TableCell>
              <TableCell>
                <form action={setBagActiveAction}>
                  <input type="hidden" name="bagId" value={bag.id} />
                  <input type="hidden" name="active" value={(!bag.active).toString()} />
                  <Button
                    type="submit"
                    size="sm"
                    variant={bag.active ? "outline" : "secondary"}
                    aria-pressed={bag.active}
                    title={bag.active ? "Retire this bag: hide it from bag pickers, keep it on past trips" : "Reactivate this bag"}
                  >
                    {bag.active ? "Active" : "Inactive"}
                  </Button>
                </form>
              </TableCell>
              <TableCell className="text-right">
                <form action={deleteBagAction}>
                  <input type="hidden" name="bagId" value={bag.id} />
                  <ConfirmSubmitButton
                    confirmMessage={`Delete bag "${bag.name}"? Items using it as their default lose that default, and trip items in it — on past trips too — become unassigned. To keep trip history, mark it Inactive instead.`}
                    size="sm"
                    variant="ghost"
                  >
                    Delete
                  </ConfirmSubmitButton>
                </form>
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                {search ? `No bags match "${search}".` : "No bags yet."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
