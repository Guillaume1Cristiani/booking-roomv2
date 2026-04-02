import { getEventByDay } from "@/lib/event";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const dateStart = searchParams.get("dStart");
  const dateEnd = searchParams.get("dEnd");
  const eventId = searchParams.get("id");
  if (!dateStart || !dateEnd || !eventId)
    return NextResponse.json([], { status: 400 });
  const rooms = await getEventByDay(Number(eventId), dateStart, dateEnd);
  if (rooms) {
    const subTagIds = rooms
      .map((event) => event.subTag_id)
      .filter((id): id is number => id !== null);
    return NextResponse.json(subTagIds);
  } else return NextResponse.json([]);
}
