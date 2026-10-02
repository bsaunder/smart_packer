"use client";

import { useMemo, useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
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
import { deleteCategoryAction, moveCategoryAction, updateCategoryAction } from "./actions";

type Category = {
  id: string;
  name: string;
  _count: { items: number };
};

export function CategoriesTable({ categories }: { categories: Category[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  return (
    <div className="flex flex-col gap-4">
      <Input
        type="search"
        placeholder="Search categories…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="w-24 text-right">Order</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((c) => {
            const index = categories.findIndex((cat) => cat.id === c.id);
            return (
              <TableRow key={c.id}>
                <TableCell>
                  <ActionForm action={updateCategoryAction} className="flex items-center gap-2">
                    <input type="hidden" name="categoryId" value={c.id} />
                    <Input name="name" defaultValue={c.name} className="h-8 w-48" />
                    <Button type="submit" size="sm" variant="ghost">
                      Save
                    </Button>
                  </ActionForm>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <form action={moveCategoryAction}>
                      <input type="hidden" name="categoryId" value={c.id} />
                      <input type="hidden" name="direction" value="up" />
                      <Button
                        type="submit"
                        size="icon-sm"
                        variant="ghost"
                        disabled={index === 0}
                        aria-label={`Move ${c.name} up`}
                      >
                        <ArrowUp />
                      </Button>
                    </form>
                    <form action={moveCategoryAction}>
                      <input type="hidden" name="categoryId" value={c.id} />
                      <input type="hidden" name="direction" value="down" />
                      <Button
                        type="submit"
                        size="icon-sm"
                        variant="ghost"
                        disabled={index === categories.length - 1}
                        aria-label={`Move ${c.name} down`}
                      >
                        <ArrowDown />
                      </Button>
                    </form>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <form action={deleteCategoryAction}>
                    <input type="hidden" name="categoryId" value={c.id} />
                    <ConfirmSubmitButton
                      confirmMessage={
                        c._count.items > 0
                          ? `Delete category "${c.name}"? Its ${c._count.items} item${c._count.items === 1 ? "" : "s"} will be moved to "Miscellaneous".`
                          : `Delete category "${c.name}"?`
                      }
                      size="sm"
                      variant="ghost"
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                </TableCell>
              </TableRow>
            );
          })}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                {search ? `No categories match "${search}".` : "No categories yet."}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
