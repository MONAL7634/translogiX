import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// Re-export the inferred session type for use in route handlers
export type AuthSession = typeof auth.$Infer.Session;

interface AuthSuccess {
  session: AuthSession;
  error?: never;
}

interface AuthFailure {
  session?: never;
  error: NextResponse;
}

export type AuthResult = AuthSuccess | AuthFailure;

/**
 * Require a valid session. Returns 401 if no session exists.
 */
export async function requireSession(
  request: NextRequest
): Promise<AuthResult> {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  return { session };
}

/**
 * Require the session user to have one of the allowed roles.
 * Returns 401 if no session, 403 if role not allowed.
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: string[]
): Promise<AuthResult> {
  const result = await requireSession(request);
  if (result.error) return result;

  const { session } = result;
  const userRole = (session.user as { role?: string }).role;

  if (!userRole || !allowedRoles.includes(userRole)) {
    return {
      error: NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      ),
    };
  }

  return { session };
}

/**
 * Get the transporterId scope for the current session.
 * - ADMIN: returns null (no filter, sees all)
 * - TRANSPORTER: returns their transporterId (force-filter)
 * - Other roles: returns error response
 *
 * Use this for endpoints where TRANSPORTERs should only see their own data.
 */
export async function requireTransporterScope(
  request: NextRequest
): Promise<
  | { session: AuthSession; transporterId: string | null; error?: never }
  | { session?: never; transporterId?: never; error: NextResponse }
> {
  const result = await requireRole(request, ["ADMIN", "TRANSPORTER"]);
  if (result.error) return result;

  const { session } = result;
  const userRole = (session.user as { role?: string }).role;
  const userTransporterId = (session.user as { transporterId?: string }).transporterId;

  if (userRole === "TRANSPORTER") {
    if (!userTransporterId) {
      return {
        error: NextResponse.json(
          { error: "No transporter account linked" },
          { status: 403 }
        ),
      };
    }
    return { session, transporterId: userTransporterId };
  }

  // ADMIN sees all
  return { session, transporterId: null };
}

/**
 * Verify that a TRANSPORTER user owns the resource (vehicle or transporter).
 * ADMIN can access any resource.
 * Returns null if authorized, or a 403 response if not.
 */
export function verifyOwnership(
  session: AuthSession,
  resourceTransporterId: string | null
): NextResponse | null {
  const userRole = (session.user as { role?: string }).role;

  // ADMIN can access anything
  if (userRole === "ADMIN") return null;

  // TRANSPORTER must own the resource
  if (userRole === "TRANSPORTER") {
    const userTransporterId = (session.user as { transporterId?: string }).transporterId;
    if (!userTransporterId || userTransporterId !== resourceTransporterId) {
      return NextResponse.json(
        { error: "Forbidden: you do not own this resource" },
        { status: 403 }
      );
    }
  }

  return null;
}
