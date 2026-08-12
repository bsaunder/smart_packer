import { getCurrentUser } from "@/lib/session";
import { listCategories } from "@/services/categoryService";

// Per-user data; must not be statically prerendered at build time.
export const dynamic = "force-dynamic";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createCategoryAction, moveCategoryAction } from "./actions";

export default async function CategoriesPage() {
  const user = await getCurrentUser();
  const categories = await listCategories(user.id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Categories</h1>

      <form action={createCategoryAction} className="flex items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">New category</Label>
          <Input id="name" name="name" placeholder="e.g. Camera" required />
        </div>
        <Button type="submit">Add</Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="w-24 text-right">Order</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((c, index) => (
            <TableRow key={c.id}>
              <TableCell>{c.name}</TableCell>
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
            </TableRow>
          ))}
          {categories.length === 0 && (
            <TableRow>
              <TableCell colSpan={2} className="text-center text-muted-foreground">
                No categories yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
