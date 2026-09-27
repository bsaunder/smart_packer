"use client";

import { useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { addItemsToTripAction } from "./actions";

export type PickerItem = {
  id: string;
  name: string;
  category: string;
  notes: string | null;
  /** Names of every Item that comes along with this one (recursive children). */
  includes: string[];
  onTrip: boolean;
};

const MAX_SUGGESTIONS = 8;

export function AddItemsPicker({ items, tripId }: { items: PickerItem[]; tripId: string }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [selected, setSelected] = useState<PickerItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const selectedIds = new Set(selected.map((i) => i.id));
    return items
      .filter(
        (item) =>
          !selectedIds.has(item.id) &&
          (item.name.toLowerCase().includes(q) ||
            item.category.toLowerCase().includes(q) ||
            (item.notes?.toLowerCase().includes(q) ?? false))
      )
      // Name matches first, then prefix matches, so "bat" surfaces batteries
      // ahead of items that only mention a battery in their notes.
      .sort((a, b) => rank(a, q) - rank(b, q) || a.name.localeCompare(b.name))
      .slice(0, MAX_SUGGESTIONS);
  }, [items, query, selected]);

  function pick(item: PickerItem) {
    if (item.onTrip) return;
    setSelected((prev) => [...prev, item]);
    setQuery("");
    setHighlighted(0);
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      // Enter picks the highlighted suggestion rather than submitting the form.
      if (open && suggestions[highlighted]) {
        e.preventDefault();
        pick(suggestions[highlighted]);
      } else if (query) {
        e.preventDefault();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Backspace" && !query && selected.length > 0) {
      setSelected((prev) => prev.slice(0, -1));
    }
  }

  async function submit(formData: FormData) {
    await addItemsToTripAction(formData);
    setSelected([]);
  }

  const showDropdown = open && query.trim().length > 0;

  return (
    <form action={submit} className="flex flex-col gap-3 rounded-lg border p-4">
      <div>
        <h3 className="font-medium">Add existing items</h3>
        <p className="text-sm text-muted-foreground">
          Search your master list. Each item brings its child items along, the same as it would through a module.
        </p>
      </div>
      <input type="hidden" name="tripId" value={tripId} />
      {selected.map((item) => (
        <input key={item.id} type="hidden" name="itemIds" value={item.id} />
      ))}

      <div className="flex flex-wrap items-start gap-3">
        <div className="relative w-full max-w-md">
          <Input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls="add-items-suggestions"
            aria-autocomplete="list"
            placeholder="Search items to add…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlighted(0);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={onKeyDown}
          />
          {showDropdown && (
            <ul
              id="add-items-suggestions"
              role="listbox"
              className="absolute top-full z-20 mt-1 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
            >
              {suggestions.length === 0 ? (
                <li className="px-3 py-2 text-sm text-muted-foreground">No items match &ldquo;{query}&rdquo;.</li>
              ) : (
                suggestions.map((item, i) => (
                  <li
                    key={item.id}
                    role="option"
                    aria-selected={i === highlighted}
                    aria-disabled={item.onTrip}
                    // mousedown, not click: fires before the input's blur closes the list.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pick(item);
                    }}
                    onMouseEnter={() => setHighlighted(i)}
                    className={cn(
                      "flex flex-col px-3 py-2 text-sm",
                      item.onTrip ? "cursor-default text-muted-foreground" : "cursor-pointer",
                      i === highlighted && !item.onTrip && "bg-muted"
                    )}
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span>{item.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {item.onTrip ? "Already on this trip" : item.category}
                      </span>
                    </span>
                    {item.includes.length > 0 && (
                      <span className="text-xs text-muted-foreground">+ {item.includes.join(", ")}</span>
                    )}
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
        <Button type="submit" disabled={selected.length === 0}>
          {selected.length <= 1 ? "Add item" : `Add ${selected.length} items`}
        </Button>
      </div>

      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {selected.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-1 rounded-full bg-muted py-1 pr-1 pl-3 text-sm"
              title={item.includes.length > 0 ? `Also adds: ${item.includes.join(", ")}` : undefined}
            >
              {item.name}
              {item.includes.length > 0 && (
                <span className="text-xs text-muted-foreground">+{item.includes.length}</span>
              )}
              <button
                type="button"
                onClick={() => setSelected((prev) => prev.filter((s) => s.id !== item.id))}
                className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                aria-label={`Remove ${item.name}`}
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

function rank(item: PickerItem, q: string) {
  const name = item.name.toLowerCase();
  if (name.startsWith(q)) return 0;
  if (name.includes(q)) return 1;
  return 2;
}
