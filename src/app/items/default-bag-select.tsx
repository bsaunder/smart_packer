import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Radix Select can't use "" as an item value, so "no default bag" is a sentinel.
export const NO_BAG = "none";

/** Parses the form value back to a bag id, or null for "no default bag". */
export function parseDefaultBagId(value: FormDataEntryValue | null) {
  const id = String(value ?? "");
  return id && id !== NO_BAG ? id : null;
}

/**
 * Default Bag picker for the item forms: active bags, plus the item's current
 * bag even if it's since been marked inactive, so saving doesn't silently
 * clear it.
 */
export function DefaultBagSelect({
  bags,
  defaultValue,
}: {
  bags: { id: string; name: string; active: boolean }[];
  defaultValue?: string | null;
}) {
  const options = bags.filter((b) => b.active || b.id === defaultValue);
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="defaultBagId">Default bag</Label>
      <Select name="defaultBagId" defaultValue={defaultValue ?? NO_BAG}>
        <SelectTrigger id="defaultBagId" className="w-40">
          <SelectValue placeholder="None" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_BAG}>None</SelectItem>
          {options.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.name}
              {!b.active && " (inactive)"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
