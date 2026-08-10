import Link from "next/link";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/categories", label: "Categories" },
  { href: "/items", label: "Items" },
  { href: "/modules", label: "Modules" },
  { href: "/trips", label: "Trips" },
];

export function Nav() {
  return (
    <nav className="border-b bg-background">
      <div className="mx-auto flex max-w-4xl items-center gap-6 px-6 py-3">
        <span className="font-semibold">Smart Packing Planner</span>
        <div className="flex gap-4 text-sm text-muted-foreground">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
