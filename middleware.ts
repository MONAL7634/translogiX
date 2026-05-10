import { NextRequest, NextResponse } from "next/server";

const roleRouteMap: Record<string, string[]> = {
  ADMIN: ["/admin"],
  TRANSPORTER: ["/transporter"],
  DRIVER: ["/driver"],
  CUSTOMER: ["/customer"],
};

const protectedRoutes = ["/admin", "/transporter", "/driver", "/customer"];

// Public route prefixes — only auth endpoints and public tracking are public
const publicRoutePrefixes = ["/login", "/track", "/api/auth"];

function isPublicRoute(pathname: string): boolean {
  return publicRoutePrefixes.some((route) => pathname.startsWith(route));
}

function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some((route) => pathname.startsWith(route));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get("better-auth.session_token");

  if (!sessionCookie) {
    // Redirect to login if no session and accessing protected route or root
    if (isProtectedRoute(pathname) || pathname === "/") {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // For root path with session, let server component handle redirect
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Verify session by calling the auth API
  try {
    const sessionResponse = await fetch(
      `${request.nextUrl.origin}/api/auth/get-session`,
      {
        headers: {
          cookie: `better-auth.session_token=${sessionCookie.value}`,
        },
      }
    );

    if (!sessionResponse.ok) {
      // Invalid session, redirect to login
      if (isProtectedRoute(pathname)) {
        const loginUrl = new URL("/login", request.url);
        return NextResponse.redirect(loginUrl);
      }
      return NextResponse.next();
    }

    const sessionData = await sessionResponse.json();
    const userRole = sessionData?.user?.role;

    if (!userRole) {
      if (isProtectedRoute(pathname)) {
        const loginUrl = new URL("/login", request.url);
        return NextResponse.redirect(loginUrl);
      }
      return NextResponse.next();
    }

    // Check role-based access for protected routes
    if (isProtectedRoute(pathname)) {
      const allowedRoutes = roleRouteMap[userRole] || [];
      const hasAccess = allowedRoutes.some((route) => pathname.startsWith(route));

      if (!hasAccess) {
        // Redirect to user's own home page
        const homeRoute = allowedRoutes[0] || "/login";
        const homeUrl = new URL(homeRoute, request.url);
        return NextResponse.redirect(homeUrl);
      }
    }

    return NextResponse.next();
  } catch {
    // On error, redirect to login for protected routes
    if (isProtectedRoute(pathname)) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};