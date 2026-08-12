import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/categories", label: "Categories" },
  { href: "/items", label: "Items" },
  { href: "/modules", label: "Modules" },
  { href: "/trips", label: "Trips" },
  { href: "/trips/history", label: "History" },
  { href: "/settings", label: "Settings" },
];

export async function Nav() {
  // Direct session check (not getCurrentUser, which redirects) — the nav
  // itself must render on /login too, before a session exists.
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <nav className="border-b bg-background">
      <div className="mx-auto flex max-w-4xl items-center gap-6 px-6 py-3">
        <span className="font-semibold">Smart Packing Planner</span>
        {session?.user && (
          <>
            <div className="flex flex-1 gap-4 text-sm text-muted-foreground">
              {links.map((l) => (
                <Link key={l.href} href={l.href} className="hover:text-foreground">
                  {l.label}
                </Link>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">{session.user.username}</span>
            <SignOutButton />
          </>
        )}
      </div>
    </nav>
  );
}
