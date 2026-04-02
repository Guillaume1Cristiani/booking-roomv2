import { db } from "@/db";
import { Rooms } from "@/db/schema";
import { CreateRoomSchema, DeleteByIdSchema, UpdateRoomSchema } from "@/lib/schemas";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

// Get all rooms
export async function GET() {
  try {
    const allRooms = await db.select().from(Rooms);
    return NextResponse.json(allRooms);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch rooms" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = CreateRoomSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }
    const [newRoom] = await db.insert(Rooms).values(parsed.data).returning();
    return NextResponse.json(newRoom);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create room" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const parsed = UpdateRoomSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }
    const { id, ...updateData } = parsed.data;
    const [updatedRoom] = await db
      .update(Rooms)
      .set(updateData)
      .where(eq(Rooms.id, id))
      .returning();
    if (!updatedRoom) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    return NextResponse.json(updatedRoom);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update room" },
      { status: 500 }
    );
  }
}

// Delete a room
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const parsed = DeleteByIdSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }
    await db.delete(Rooms).where(eq(Rooms.id, parsed.data.id));
    return NextResponse.json({ message: "Room deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete room" },
      { status: 500 }
    );
  }
}
