import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getItem } from "@/services/itemService";
import { listCategories } from "@/services/categoryService";
import { listBags } from "@/services/bagService";
import { DefaultBagSelect } from "../../default-bag-select";
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
import { updateItemAction } from "./actions";

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const [item, categories, bags] = await Promise.all([
    getItem(user.id, id),
    listCategories(user.id),
    listBags(user.id),
  ]);

  if (!item) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Edit Item</h1>

      <ActionForm action={updateItemAction} className="flex flex-col gap-4 rounded-lg border p-4">
        <input type="hidden" name="itemId" value={item.id} />
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={item.name} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="categoryId">Category</Label>
            <Select name="categoryId" defaultValue={item.categoryId} required>
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
              defaultValue={item.defaultQuantity}
              className="w-24"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" defaultValue={item.notes ?? ""} placeholder="optional" className="w-48" />
          </div>
          <DefaultBagSelect bags={bags} defaultValue={item.defaultBagId} />
        </div>

        <label className="flex w-fit items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={item.active} />
          Active
        </label>

        <div className="flex gap-3">
          <Button type="submit">Save changes</Button>
          <Button asChild variant="outline">
            <Link href="/items">Cancel</Link>
          </Button>
        </div>
      </ActionForm>
    </div>
  );
}
