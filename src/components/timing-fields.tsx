"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TIMING_PRESETS, type Anchor } from "@/lib/taskTiming";

/**
 * The "Checklist" + "When" inputs for a task, read server-side by
 * parseTiming(): `anchor` (Pre-Departure / After Return), `timing` (a
 * preset's days, "custom", or "inherit"), and `customDays` when custom.
 *
 * `allowInherit` adds "Same as parent task", for forms that can create
 * sub-tasks. A sub-task's checklist always follows its parent's,
 * whatever is picked here (enforced in taskService).
 */
export function TimingFields({
  anchor: initialAnchor = "DEPARTURE",
  offsetDays,
  allowInherit = false,
  idPrefix = "timing",
}: {
  anchor?: Anchor;
  offsetDays?: number | null;
  allowInherit?: boolean;
  idPrefix?: string;
}) {
  const isPreset = (a: Anchor, d: number | null | undefined) =>
    d != null && TIMING_PRESETS[a].some((p) => p.days === d);

  const [anchor, setAnchor] = useState<Anchor>(initialAnchor);
  const [timing, setTiming] = useState<string>(() => {
    if (offsetDays == null) return allowInherit && offsetDays === null ? "inherit" : "1";
    return isPreset(initialAnchor, offsetDays) ? String(offsetDays) : "custom";
  });
  const [customDays, setCustomDays] = useState(
    offsetDays != null && !isPreset(initialAnchor, offsetDays) ? String(offsetDays) : ""
  );

  function changeAnchor(next: Anchor) {
    setAnchor(next);
    // Keep a preset choice valid for the other checklist's presets.
    if (timing !== "custom" && timing !== "inherit" && !isPreset(next, Number(timing))) {
      setTiming(String(TIMING_PRESETS[next][0].days));
    }
  }

  return (
    <>
      <input type="hidden" name="anchor" value={anchor} />
      <input type="hidden" name="timing" value={timing} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-anchor`}>Checklist</Label>
        <Select value={anchor} onValueChange={(v) => changeAnchor(v as Anchor)}>
          <SelectTrigger id={`${idPrefix}-anchor`} className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DEPARTURE">Pre-Departure</SelectItem>
            <SelectItem value="RETURN">After Return</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-when`}>When</Label>
        <div className="flex items-center gap-2">
          <Select value={timing} onValueChange={setTiming}>
            <SelectTrigger id={`${idPrefix}-when`} className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allowInherit && <SelectItem value="inherit">Same as parent task</SelectItem>}
              {TIMING_PRESETS[anchor].map((p) => (
                <SelectItem key={p.days} value={String(p.days)}>
                  {p.label}
                </SelectItem>
              ))}
              <SelectItem value="custom">Custom…</SelectItem>
            </SelectContent>
          </Select>
          {timing === "custom" && (
            <>
              <Input
                name="customDays"
                type="number"
                min={0}
                required
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                aria-label="Number of days"
                className="w-20"
              />
              <span className="whitespace-nowrap text-sm text-muted-foreground">
                days {anchor === "DEPARTURE" ? "before departure" : "after return"}
              </span>
            </>
          )}
        </div>
      </div>
    </>
  );
}
