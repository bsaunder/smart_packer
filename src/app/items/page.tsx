import { getCurrentUser } from "@/lib/session";
import { listItems } from "@/services/itemService";
import { listCategories } from "@/services/categoryService";
import { listBags } from "@/services/bagService";

// Per-user data; must not be statically prerendered at build time.
export const dynamic = "force-dynamic";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ActionForm } from "@/components/action-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ItemsTable } from "./items-table";
import { DefaultBagSelect } from "./default-bag-select";
import {
  createItemAction,
  createCategoryInlineAction,
  addChildAction,
} from "./actions";

export default async function ItemsPage() {
  const user = await getCurrentUser();
  const [items, categories, bags] = await Promise.all([
    listItems(user.id),
    listCategories(user.id),
    listBags(user.id),
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
        <ActionForm resetOnSuccess action={createItemAction} className="flex flex-wrap items-end gap-3">
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
          {bags.length > 0 && <DefaultBagSelect bags={bags} />}
          <Button type="submit">Add item</Button>
        </ActionForm>
      )}

      <ItemsTable items={items} categories={categories} bags={bags} />

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
