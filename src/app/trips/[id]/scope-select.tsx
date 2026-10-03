"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Option = { scope: string; label: string; href: string };

/**
 * The packing list's "Show" filter: all items, one category, or one bag.
 * A dropdown rather than pills, since a real trip easily has dozens of
 * categories and bags. Each choice navigates to its precomputed view link,
 * so the filter stays in the URL like the other view controls.
 */
export function ScopeSelect({
  scope,
  allHref,
  categories,
  bags,
}: {
  scope: string;
  allHref: string;
  categories: Option[];
  bags: Option[];
}) {
  const router = useRouter();
  const hrefFor = new Map([["all", allHref], ...[...categories, ...bags].map((o) => [o.scope, o.href] as const)]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Show:</span>
      <Select value={scope} onValueChange={(v) => router.push(hrefFor.get(v) ?? allHref)}>
        <SelectTrigger className="h-8 w-56" aria-label="Show category or bag">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All items</SelectItem>
          {categories.length > 0 && (
            <>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>Categories</SelectLabel>
                {categories.map((o) => (
                  <SelectItem key={o.scope} value={o.scope}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </>
          )}
          {bags.length > 0 && (
            <>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>Bags</SelectLabel>
                {bags.map((o) => (
                  <SelectItem key={o.scope} value={o.scope}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
