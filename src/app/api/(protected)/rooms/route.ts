import { db } from "@/db";
import { Rooms } from "@/db/schema";
import { handleRouteError, newCorrelationId, NotFoundError } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { CreateRoomSchema, DeleteByIdSchema, UpdateRoomSchema } from "@/lib/schemas";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const correlationId = newCorrelationId();
  try {
    const allRooms = await db.select().from(Rooms);
    return NextResponse.json(allRooms);
  } catch (error) {
    return handleRouteError(error, correlationId, "GET /rooms");
  }
}

export async function POST(request: NextRequest) {
  const correlationId = newCorrelationId();
  try {
    const body = await request.json();
    const parsed = CreateRoomSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten(), correlationId }, { status: 422 });
    }
    const [newRoom] = await db.insert(Rooms).values(parsed.data).returning();
    void logAudit({
      action: "create",
      resource: "room",
      resourceId: newRoom.id,
      userId: request.headers.get("x-ms-user-id"),
      societyId: request.headers.get("x-society-id") ? parseInt(request.headers.get("x-society-id")!, 10) : null,
      metadata: parsed.data,
    });
    return NextResponse.json(newRoom, { status: 201 });
  } catch (error) {
    return handleRouteError(error, correlationId, "POST /rooms");
  }
}

export async function PUT(request: NextRequest) {
  const correlationId = newCorrelationId();
  try {
    const body = await request.json();
    const parsed = UpdateRoomSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten(), correlationId }, { status: 422 });
    }
    const { id, ...updateData } = parsed.data;
    const [updatedRoom] = await db
      .update(Rooms)
      .set(updateData)
      .where(eq(Rooms.id, id))
      .returning();
    if (!updatedRoom) throw new NotFoundError("Room");
    void logAudit({
      action: "update",
      resource: "room",
      resourceId: id,
      userId: request.headers.get("x-ms-user-id"),
      societyId: request.headers.get("x-society-id") ? parseInt(request.headers.get("x-society-id")!, 10) : null,
      metadata: updateData,
    });
    return NextResponse.json(updatedRoom);
  } catch (error) {
    return handleRouteError(error, correlationId, "PUT /rooms");
  }
}

export async function DELETE(request: NextRequest) {
  const correlationId = newCorrelationId();
  try {
    const body = await request.json();
    const parsed = DeleteByIdSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten(), correlationId }, { status: 422 });
    }
    await db.delete(Rooms).where(eq(Rooms.id, parsed.data.id));
    void logAudit({
      action: "delete",
      resource: "room",
      resourceId: parsed.data.id,
      userId: request.headers.get("x-ms-user-id"),
      societyId: request.headers.get("x-society-id") ? parseInt(request.headers.get("x-society-id")!, 10) : null,
    });
    return NextResponse.json({ message: "Room deleted successfully" });
  } catch (error) {
    return handleRouteError(error, correlationId, "DELETE /rooms");
  }
}
