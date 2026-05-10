import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transporters } from "@/lib/db/schema";
import { transporterSchema } from "@/lib/validations";
import { desc, ilike, or } from "drizzle-orm";
import { requireRole } from "@/lib/auth/api-utils";

export async function GET(request: NextRequest) {
  // Verify session and ADMIN role
  const authResult = await requireRole(request, ["ADMIN"]);
  if (authResult.error) return authResult.error;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    let query = db
      .select()
      .from(transporters)
      .orderBy(desc(transporters.createdAt));

    if (search) {
      query = query.where(
        or(
          ilike(transporters.name, `%${search}%`),
          ilike(transporters.contactPerson, `%${search}%`),
          ilike(transporters.phone, `%${search}%`)
        )
      ) as typeof query;
    }

    const results = await query;

    return NextResponse.json({ transporters: results });
  } catch (error) {
    console.error("Error fetching transporters:", error);
    return NextResponse.json(
      { error: "Failed to fetch transporters" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Verify session and ADMIN role
  const authResult = await requireRole(request, ["ADMIN"]);
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const validated = transporterSchema.parse(body);

    const [transporter] = await db
      .insert(transporters)
      .values({
        name: validated.name,
        gstNumber: validated.gstNumber || null,
        contactPerson: validated.contactPerson,
        phone: validated.phone,
        email: validated.email || null,
        status: validated.status || "active",
      })
      .returning();

    return NextResponse.json({ transporter }, { status: 201 });
  } catch (error) {
    console.error("Error creating transporter:", error);
    return NextResponse.json(
      { error: "Failed to create transporter" },
      { status: 500 }
    );
  }
}
