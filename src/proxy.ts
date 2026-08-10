import { type NextRequest, NextResponse } from "next/server";
import { isDemoMode } from "@/lib/mode";
import { updateSession } from "@/lib/supabase/proxy";

const PUBLIC_PATHS = ["/login", "/register", "/auth/callback"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (isDemoMode()) {
    const demoUser = request.cookies.get("wxu_demo_user")?.value;
    const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
    if (!demoUser && !isPublic && pathname !== "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    if (demoUser && (pathname === "/login" || pathname === "/register")) {
      const url = request.nextUrl.clone();
      url.pathname = "/users";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const response = await updateSession(request);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
