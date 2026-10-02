import Link from "next/link";
import { headers } from "next/headers";
import { Luggage } from "lucide-react";
import { auth } from "@/lib/auth";
import { NavLinks } from "@/components/nav-links";

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

  return (
    <nav className="sticky top-0 z-10 border-b border-border/60 bg-background/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-4xl items-center gap-6 px-6 py-3">
        <Link href="/" className="flex items-center gap-2 font-heading font-semibold tracking-tight">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Luggage className="size-4" />
          </span>
          Smart Packing Planner
        </Link>
        {signedIn && <NavLinks username={session!.user.username ?? session!.user.name} isAdmin={!!session!.user.isAdmin} />}
      </div>
    </nav>
  );
}
