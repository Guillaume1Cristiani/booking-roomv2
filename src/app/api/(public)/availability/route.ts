import { db } from "@/db";
import { Events, User } from "@/db/schema";
import { formatISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { and, eq, gte, lte } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("roomid"));

  /* if (!id) {
    return NextResponse.json({ error: "Room ID is required" }, { status: 400 });
  }

  // Fetch the room by its ID
  const [room] = await db.select().from(Rooms).where(eq(Rooms.id, id));

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }*/

  // Get the current time in France's timezone
  const nowUTC = new Date();
  const timeZone = "Europe/Paris"; // France's timezone
  const nowInFrance = toZonedTime(nowUTC, timeZone); // Convert UTC to France timezone
  const nowInFranceISO = formatISO(nowInFrance); // Format as ISO string

  // Find events for the room that are ongoing
  const output = await db
    .select()
    .from(Events)
    .innerJoin(User, eq(User.microsoft_id, Events.microsoft_id))
    .where(
      and(
        //eq(Events.subTag_id, room.id), // Assuming `subTag_id` links the event to the room
        gte(Events.dateEnd, nowInFranceISO), // Current time is before the event ends
        lte(Events.dateStart, nowInFranceISO) // Current time is after the event starts
      )
    );

  // Nom de chaque salle
  // À quelle salle ça appartient / Le status
  // End Date
  if (output.length > 0) {
    const events = output.map((event) => ({
      title: event.events.name,
      status: true,
      startTime: event.events.dateStart,
      endTime: event.events.dateEnd,
      owner: `${event.users.givenName} ${event.users.surname}`,
      subtag_id: event.events.subTag_id,
    }));

    return NextResponse.json(
      {
        events: events,
      },
      { status: 200 }
    );
  }

  return NextResponse.json(output, { status: 200 });
}
