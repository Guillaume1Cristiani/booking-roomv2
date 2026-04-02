import { Room } from "@/components/Calendar/types/types";
import { db } from "@/db";
import { Rooms } from "@/db/schema";
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
    const body: Room = await request.json();
    const [newRoom] = await db.insert(Rooms).values(body).returning();
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
    const body: Room = await request.json();
    const { id, ...updateData } = body;
    const [updatedRoom] = await db
      .update(Rooms)
      .set(updateData)
      .where(eq(Rooms.id, id))
      .returning();
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
    const { id }: { id: number } = await request.json();
    await db.delete(Rooms).where(eq(Rooms.id, id));
    return NextResponse.json({ message: "Room deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete room" },
      { status: 500 }
    );
  }
}
