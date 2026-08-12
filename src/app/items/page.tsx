import { getCurrentUser } from "@/lib/session";
import { listItems } from "@/services/itemService";
import { listCategories } from "@/services/categoryService";

// Per-user data; must not be statically prerendered at build time.
export const dynamic = "force-dynamic";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import Link from "next/link";
import {
  createItemAction,
  createCategoryInlineAction,
  addChildAction,
  setItemActiveAction,
} from "./actions";

export default async function ItemsPage() {
  const user = await getCurrentUser();
  const [items, categories] = await Promise.all([
    listItems(user.id),
    listCategories(user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Master Items</h1>

      {categories.length === 0 ? (
        <form action={createCategoryInlineAction} className="flex items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newCategoryName">
              Create a category first
            </Label>
            <Input id="newCategoryName" name="newCategoryName" placeholder="e.g. Camera" required />
          </div>
          <Button type="submit">Add category</Button>
        </form>
      ) : (
        <form action={createItemAction} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="e.g. Passport" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="categoryId">Category</Label>
            <Select name="categoryId" required>
              <SelectTrigger id="categoryId" className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="defaultQuantity">Default qty</Label>
            <Input
              id="defaultQuantity"
              name="defaultQuantity"
              type="number"
              min={1}
              defaultValue={1}
              className="w-24"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" placeholder="optional" className="w-48" />
          </div>
          <Button type="submit">Add item</Button>
        </form>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Default qty</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Children</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} className={item.active ? "" : "text-muted-foreground"}>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.category.name}</TableCell>
              <TableCell className="text-right">{item.defaultQuantity}</TableCell>
              <TableCell className="text-muted-foreground">{item.notes}</TableCell>
              <TableCell className="text-muted-foreground">
                {item.childLinks.map((l) => l.childItem.name).join(", ")}
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
              <TableCell>
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/items/${item.id}/edit`}>Edit</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No items yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {items.length > 1 && (
        <form action={addChildAction} className="flex items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="parentId">Parent</Label>
            <Select name="parentId" required>
              <SelectTrigger id="parentId" className="w-48">
                <SelectValue placeholder="Parent item" />
              </SelectTrigger>
              <SelectContent>
                {items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="childId">Child</Label>
            <Select name="childId" required>
              <SelectTrigger id="childId" className="w-48">
                <SelectValue placeholder="Child item" />
              </SelectTrigger>
              <SelectContent>
                {items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" variant="secondary">
            Link as child
          </Button>
        </form>
      )}
    </div>
  );
}
