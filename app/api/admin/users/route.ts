import { NextRequest, NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessions, transporters, users } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/api-utils";

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ["ADMIN"]);
  if (authResult.error) return authResult.error;

  try {
    const [userRows, transporterRows] = await Promise.all([
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          transporterId: users.transporterId,
          transporterName: transporters.name,
          emailVerified: users.emailVerified,
          createdAt: users.createdAt,
          sessionCount: sql<number>`count(sessions.id)::int`,
        })
        .from(users)
        .leftJoin(transporters, eq(users.transporterId, transporters.id))
        .leftJoin(sessions, eq(sessions.userId, users.id))
        .groupBy(users.id, transporters.name)
        .orderBy(desc(users.createdAt)),
      db
        .select({
          id: transporters.id,
          name: transporters.name,
          status: transporters.status,
        })
        .from(transporters)
        .orderBy(transporters.name),
    ]);

    return NextResponse.json({ users: userRows, transporters: transporterRows });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
