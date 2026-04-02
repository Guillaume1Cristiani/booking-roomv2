import {
  fetchAllRooms,
  fetchReservations,
  mergeRoomsAndReservations,
} from "@/app/data/rooms";
import type { Booking, Room } from "@/app/types";
import { NextResponse } from "next/server";

export const revalidate = 0; // no cache

export async function GET() {
  try {
    const rooms: Room[] = await fetchAllRooms(); // server-only ok
    const reservations: { events: Booking[] } | [] = await fetchReservations();
    const data = mergeRoomsAndReservations(rooms, reservations);
    return NextResponse.json({ data });
  } catch (e) {
    console.error("GET /api/availability", e);
    // keep shape stable so the client never breaks
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}
