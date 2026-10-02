import { getCurrentUser } from "@/lib/session";
import { listCategories } from "@/services/categoryService";

// Per-user data; must not be statically prerendered at build time.
export const dynamic = "force-dynamic";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ActionForm } from "@/components/action-form";
import { createCategoryAction } from "./actions";
import { CategoriesTable } from "./categories-table";

export default async function CategoriesPage() {
  const user = await getCurrentUser();
  const categories = await listCategories(user.id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Categories</h1>

      <ActionForm resetOnSuccess action={createCategoryAction} className="flex items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">New category</Label>
          <Input id="name" name="name" placeholder="e.g. Camera" required />
        </div>
        <Button type="submit">Add</Button>
      </ActionForm>

      <CategoriesTable categories={categories} />
    </div>
  );
}
