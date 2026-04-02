import { getEventByDay } from "@/lib/event";
import { handleRouteError, newCorrelationId } from "@/lib/errors";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const correlationId = newCorrelationId();
  const { searchParams } = new URL(request.url);

  const dateStart = searchParams.get("dStart");
  const dateEnd = searchParams.get("dEnd");
  const eventId = searchParams.get("id");
  if (!dateStart || !dateEnd || !eventId) {
    return NextResponse.json(
      { error: "Missing required query params: dStart, dEnd, id", correlationId },
      { status: 400 }
    );
  }

  try {
    const rooms = await getEventByDay(Number(eventId), dateStart, dateEnd);
    if (rooms) {
      const subTagIds = rooms
        .map((event) => event.subTag_id)
        .filter((id): id is number => id !== null);
      return NextResponse.json(subTagIds);
    }
    return NextResponse.json([]);
  } catch (error) {
    return handleRouteError(error, correlationId, "GET /events/conflicts");
  }
}
