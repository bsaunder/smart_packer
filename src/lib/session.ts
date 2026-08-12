import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Every Server Component/Server Action in this app calls this first and
 * treats the result as guaranteed-present -- redirecting here (rather than
 * returning null) keeps every existing call site correct without an
 * app-wide null-check refactor, and is itself the CVE-2025-29927-safe
 * authorization boundary DESIGN.md requires: this runs in the actual
 * page/action code, not just middleware (see src/middleware.ts, which only
 * does a coarse optimistic redirect based on the session cookie's
 * presence).
 */
export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }
  return session.user;
}
