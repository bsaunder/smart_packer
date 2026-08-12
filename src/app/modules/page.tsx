import { getCurrentUser } from "@/lib/session";
import { listModules } from "@/services/moduleService";
import { listItems } from "@/services/itemService";

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
import { X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createModuleAction, addItemToModuleAction, removeItemFromModuleAction } from "./actions";

export default async function ModulesPage() {
  const user = await getCurrentUser();
  const [modules, items] = await Promise.all([
    listModules(user.id),
    listItems(user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Modules</h1>

      <form action={createModuleAction} className="flex items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">New module</Label>
          <Input id="name" name="name" placeholder="e.g. Cruise" required />
        </div>
        <Button type="submit">Add</Button>
      </form>

      <div className="flex flex-col gap-4">
        {modules.map((m) => (
          <Card key={m.id}>
            <CardHeader>
              <CardTitle>{m.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {m.moduleItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {m.moduleItems.map((mi) => (
                    <form key={mi.itemId} action={removeItemFromModuleAction}>
                      <input type="hidden" name="moduleId" value={m.id} />
                      <input type="hidden" name="itemId" value={mi.itemId} />
                      <button
                        type="submit"
                        title={`Remove ${mi.item.name} from this module`}
                        className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                      >
                        {mi.item.name}
                        <X className="size-3" />
                      </button>
                    </form>
                  ))}
                </div>
              )}
              {items.length > 0 && (
                <form action={addItemToModuleAction} className="flex items-end gap-3">
                  <input type="hidden" name="moduleId" value={m.id} />
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`itemId-${m.id}`}>Add item</Label>
                    <Select name="itemId" required>
                      <SelectTrigger id={`itemId-${m.id}`} className="w-56">
                        <SelectValue placeholder="Select an item" />
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
                  <Button type="submit" size="sm" variant="secondary">
                    Add
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        ))}
        {modules.length === 0 && (
          <p className="text-muted-foreground">No modules yet.</p>
        )}
      </div>
    </div>
  );
}
