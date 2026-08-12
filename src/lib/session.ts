import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Every Server Component/Server Action in this app calls this first and
 * treats the result as guaranteed-present -- redirecting here (rather than
 * returning null) keeps every existing call site correct without an
 * app-wide null-check refactor, and is itself the CVE-2025-29927-safe
 * authorization boundary DESIGN.md requires: this runs in the actual
 * page/action code, not just middleware (see src/proxy.ts, which only does
 * a coarse optimistic redirect based on the session cookie's presence).
 *
 * Also re-checks isActive on every call, not just at login (see
 * databaseHooks.session.create in src/lib/auth.ts) -- a user deactivated
 * mid-session is cut off before their existing session cookie expires,
 * not just blocked from signing in again.
 */
export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || !session.user.isActive) {
    redirect("/login");
  }
  return session.user;
}

/** For /admin pages and actions: redirects non-admins to the Dashboard. */
export async function getCurrentAdmin() {
  const user = await getCurrentUser();
  if (!user.isAdmin) {
    redirect("/");
  }
  return user;
}
