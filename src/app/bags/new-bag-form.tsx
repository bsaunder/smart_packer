import { ActionForm } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createBagAction } from "./actions";

export function NewBagForm() {
  return (
    <ActionForm resetOnSuccess action={createBagAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">New bag</Label>
        <Input id="name" name="name" placeholder="e.g. Pelican Case" required className="w-48" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bagType">Type</Label>
        <Input id="bagType" name="bagType" placeholder="optional" className="w-32" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="color">Color</Label>
        <Input id="color" name="color" placeholder="optional" className="w-24" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="weightLimit">Weight limit</Label>
        <Input id="weightLimit" name="weightLimit" type="number" min={0} step="0.1" placeholder="optional" className="w-28" />
      </div>
      <Button type="submit">Add</Button>
    </ActionForm>
  );
}
