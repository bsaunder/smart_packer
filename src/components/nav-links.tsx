"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-1 items-center gap-1 text-sm">
      {links.map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "rounded-full px-3 py-1.5 font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
