import { db } from "@/db";
import { Rooms } from "@/db/schema";
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
