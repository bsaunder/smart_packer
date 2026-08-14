import Link from "next/link";
import { headers } from "next/headers";
import { Luggage } from "lucide-react";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";
import { NavLinks } from "@/components/nav-links";

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
  // itself must render on /login too, before a session exists. Also checks
  // isActive directly: a session created before deactivation can still
  // pass auth.api.getSession() (only new sign-ins are blocked by the
  // databaseHooks check in src/lib/auth.ts), so without this a deactivated
  // user would see a nav full of links that every page then bounces them
  // out of via getCurrentUser().
  const session = await auth.api.getSession({ headers: await headers() });
  const signedIn = session?.user?.isActive ?? false;

  const visibleLinks = signedIn && session!.user.isAdmin ? [...links, { href: "/admin/users", label: "Admin" }] : links;

  return (
    <nav className="sticky top-0 z-10 border-b border-border/60 bg-background/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-4xl items-center gap-6 px-6 py-3">
        <Link href="/" className="flex items-center gap-2 font-heading font-semibold tracking-tight">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Luggage className="size-4" />
          </span>
          Smart Packing Planner
        </Link>
        {signedIn && (
          <>
            <NavLinks links={visibleLinks} />
            <span className="text-sm text-muted-foreground">{session!.user.username}</span>
            <SignOutButton />
          </>
        )}
      </div>
    </nav>
  );
}
