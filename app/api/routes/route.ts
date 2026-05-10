import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { routes } from "@/lib/db/schema";
import { routeApiSchema } from "@/lib/validations";
import { desc, ilike, or } from "drizzle-orm";
import { requireRole } from "@/lib/auth/api-utils";

export async function GET(request: NextRequest) {
  // Verify session — ADMIN or TRANSPORTER can read routes (for shipment form)
  const authResult = await requireRole(request, ["ADMIN", "TRANSPORTER"]);
  if (authResult.error) return authResult.error;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    let query = db
      .select()
      .from(routes)
      .orderBy(desc(routes.createdAt));

    if (search) {
      query = query.where(
        or(
          ilike(routes.origin, `%${search}%`),
          ilike(routes.destination, `%${search}%`)
        )
      ) as typeof query;
    }

    const results = await query;

    return NextResponse.json({ routes: results });
  } catch (error) {
    console.error("Error fetching routes:", error);
    return NextResponse.json(
      { error: "Failed to fetch routes" },
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
    const validated = routeApiSchema.parse(body);

    const [route] = await db
      .insert(routes)
      .values({
        origin: validated.origin,
        destination: validated.destination,
        distanceKm: String(validated.distanceKm),
        estimatedTime: validated.estimatedTime,
        billingRate: String(validated.billingRate),
        vendorRate: String(validated.vendorRate),
      })
      .returning();

    return NextResponse.json({ route }, { status: 201 });
  } catch (error) {
    console.error("Error creating route:", error);
    return NextResponse.json(
      { error: "Failed to create route" },
      { status: 500 }
    );
  }
}
