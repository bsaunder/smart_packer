import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** "Sub-task of" picker: only top-level tasks can be parents (one level deep). */
export function ParentSelect({
  tasks,
  defaultValue,
  excludeId,
}: {
  tasks: { id: string; name: string; parentId: string | null }[];
  defaultValue?: string | null;
  excludeId?: string;
}) {
  const options = tasks.filter((t) => !t.parentId && t.id !== excludeId);
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="parentId">Sub-task of</Label>
      <Select name="parentId" defaultValue={defaultValue ?? "none"}>
        <SelectTrigger id="parentId" className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None (top-level)</SelectItem>
          {options.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
