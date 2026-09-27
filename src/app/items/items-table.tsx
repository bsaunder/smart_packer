"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { setItemActiveAction, deleteItemAction } from "./actions";

const ALL_CATEGORIES = "all";

type Item = {
  id: string;
  name: string;
  notes: string | null;
  defaultQuantity: number;
  active: boolean;
  category: { id: string; name: string };
  childLinks: { childItem: { name: string } }[];
};

export function ItemsTable({
  items,
  categories,
}: {
  items: Item[];
  categories: { id: string; name: string }[];
}) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState(ALL_CATEGORIES);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (categoryId !== ALL_CATEGORIES && item.category.id !== categoryId) return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || (item.notes?.toLowerCase().includes(q) ?? false);
    });
  }, [items, search, categoryId]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <Input
          type="search"
          placeholder="Search items…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Default qty</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Children</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-32" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((item) => (
            <TableRow key={item.id} className={item.active ? "" : "text-muted-foreground"}>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.category.name}</TableCell>
              <TableCell className="text-right">{item.defaultQuantity}</TableCell>
              <TableCell className="max-w-xs whitespace-normal text-muted-foreground">{item.notes}</TableCell>
              <TableCell className="max-w-xs whitespace-normal text-muted-foreground">
                {item.childLinks.length > 0 && (
                  <ul className="list-disc pl-4">
                    {item.childLinks.map((l) => (
                      <li key={l.childItem.name}>{l.childItem.name}</li>
                    ))}
                  </ul>
                )}
              </TableCell>
              <TableCell>
                <form action={setItemActiveAction}>
                  <input type="hidden" name="itemId" value={item.id} />
                  <input type="hidden" name="active" value={(!item.active).toString()} />
                  <Button
                    type="submit"
                    size="sm"
                    variant={item.active ? "outline" : "secondary"}
                    aria-pressed={item.active}
                  >
                    {item.active ? "Active" : "Inactive"}
                  </Button>
                </form>
              </TableCell>
              <TableCell className="flex items-center gap-1">
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/items/${item.id}/edit`}>Edit</Link>
                </Button>
                <form action={deleteItemAction}>
                  <input type="hidden" name="itemId" value={item.id} />
                  <ConfirmSubmitButton
                    confirmMessage={`Delete item "${item.name}"? This also removes it from any modules and parent/child links.`}
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
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                {items.length === 0 ? "No items yet." : "No items match your search/filter."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
