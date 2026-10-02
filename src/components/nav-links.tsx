"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { ChevronDown } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type NavLink = { href: string; label: string };

const TRIPS: NavLink[] = [
  { href: "/trips", label: "All Trips" },
  { href: "/trips/history", label: "History" },
];

// The reusable master data trips are built from.
const LIBRARY: NavLink[] = [
  { href: "/items", label: "Items" },
  { href: "/categories", label: "Categories" },
  { href: "/bags", label: "Bags" },
  { href: "/tasks", label: "Tasks" },
  { href: "/modules", label: "Modules" },
];

const pill = (active: boolean) =>
  cn(
    "inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
    active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
  );

/**
 * The most specific link matching the current path, so /trips/history
 * highlights History rather than All Trips (which it also starts with).
 */
function activeHref(pathname: string, links: NavLink[]) {
  return links
    .filter((l) => (l.href === "/" ? pathname === "/" : pathname === l.href || pathname.startsWith(`${l.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

export function NavLinks({ username, isAdmin }: { username: string; isAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  const account: NavLink[] = [
    { href: "/settings", label: "Settings" },
    ...(isAdmin ? [{ href: "/admin/users", label: "Admin" }] : []),
  ];
  const current = activeHref(pathname, [{ href: "/", label: "Dashboard" }, ...TRIPS, ...LIBRARY, ...account]);

  return (
    <div className="flex flex-1 items-center gap-1 text-sm">
      <Link href="/" className={pill(current === "/")}>
        Dashboard
      </Link>
      <Menu label="Trips" links={TRIPS} current={current} />
      <Menu label="Library" links={LIBRARY} current={current} />

      <div className="ml-auto">
        <Menu label={username} links={account} current={current} align="end">
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            onSelect={async () => {
              await authClient.signOut();
              router.push("/login");
              router.refresh();
            }}
            className={itemClass(false)}
          >
            Sign out
          </DropdownMenu.Item>
        </Menu>
      </div>
    </div>
  );
}

function itemClass(active: boolean) {
  return cn(
    "flex cursor-pointer select-none items-center rounded-md px-2.5 py-1.5 text-sm outline-none data-[highlighted]:bg-muted",
    active ? "font-medium text-foreground" : "text-muted-foreground data-[highlighted]:text-foreground"
  );
}

function Menu({
  label,
  links,
  current,
  align = "start",
  children,
}: {
  label: string;
  links: NavLink[];
  current: string | undefined;
  align?: "start" | "end";
  children?: React.ReactNode;
}) {
  const active = links.some((l) => l.href === current);
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger className={cn(pill(active), "group")}>
        {label}
        <ChevronDown className="size-3.5 transition-transform group-data-[state=open]:rotate-180" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={6}
          className="z-50 min-w-40 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {links.map((l) => (
            <DropdownMenu.Item key={l.href} asChild className={itemClass(l.href === current)}>
              <Link href={l.href} aria-current={l.href === current ? "page" : undefined}>
                {l.label}
              </Link>
            </DropdownMenu.Item>
          ))}
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
