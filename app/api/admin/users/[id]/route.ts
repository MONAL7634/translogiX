import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/api-utils";

const updateUserSchema = z.object({
  role: z.enum(["ADMIN", "TRANSPORTER", "DRIVER", "CUSTOMER"]).optional(),
  transporterId: z.string().uuid().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ["ADMIN"]);
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const validated = updateUserSchema.parse(body);

    const [existing] = await db.select().from(users).where(eq(users.id, id));
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const nextRole = validated.role ?? existing.role;
    const nextTransporterId =
      nextRole === "TRANSPORTER" || nextRole === "DRIVER"
        ? validated.transporterId !== undefined
          ? validated.transporterId
          : existing.transporterId
        : null;

    const [updated] = await db
      .update(users)
      .set({
        ...(validated.role !== undefined && { role: validated.role }),
        transporterId: nextTransporterId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        transporterId: users.transporterId,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
      });

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
