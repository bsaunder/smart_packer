import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Optimistic redirect only (cookie presence, not validity) -- this is a UX
 * nicety, not the authorization boundary. Per DESIGN.md's Authentication
 * section (CVE-2025-29927: middleware-only session protection in Next.js
 * can be bypassed by spoofing the x-middleware-subrequest header), real
 * authorization happens in getCurrentUser() (src/lib/session.ts), called
 * from every Server Component/Server Action, not here.
 */
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
