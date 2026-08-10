import { getCurrentUser } from "@/lib/session";
import { listCategories } from "@/services/categoryService";
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
import { createCategoryAction } from "./actions";

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
            <TableHead className="text-right">Sort order</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.name}</TableCell>
              <TableCell className="text-right">{c.sortOrder}</TableCell>
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
