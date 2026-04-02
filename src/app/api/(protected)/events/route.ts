import { Events, NewEvent, User } from "@/db/schema";
import { db } from "@/lib/db";
import { createEvent, deleteEvent, updateEvent } from "@/lib/event";
import { CreateEventSchema, DeleteByIdSchema, UpdateEventSchema } from "@/lib/schemas";
import { and, eq, gte, lte } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

function isValidDateString(dateString: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(dateString);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateStart = searchParams.get("dateStart");
  const dateEnd = searchParams.get("dateEnd");
  // Filter events to the caller's society when the header is present.
  const societyIdHeader = request.headers.get("x-society-id");
  const societyId = societyIdHeader ? parseInt(societyIdHeader, 10) : null;

  try {
    const baseQuery = db
      .select()
      .from(Events)
      .innerJoin(User, eq(User.microsoft_id, Events.microsoft_id));

    const societyFilter = societyId
      ? eq(Events.society_id, societyId)
      : undefined;

    const rows = await (dateStart && dateEnd
      ? (() => {
          if (!isValidDateString(dateStart) || !isValidDateString(dateEnd)) {
            return null;
          }
          const dateFilter = and(
            gte(Events.dateStart, new Date(dateStart)),
            lte(Events.dateEnd, new Date(dateEnd))
          );
          return baseQuery.where(
            societyFilter ? and(dateFilter, societyFilter) : dateFilter
          );
        })()
      : societyFilter
        ? baseQuery.where(societyFilter)
        : baseQuery);

    if (rows === null) {
      return NextResponse.json(
        { error: "Invalid date format. Use ISO 8601 (YYYY-MM-DDTHH:mm:ss.mmmZ)." },
        { status: 400 }
      );
    }

    const events = rows.map((row) => ({ ...row.events, user: row.users }));

    return NextResponse.json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.json();
  const parsed = CreateEventSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  // Identity is resolved once in middleware and forwarded via x-ms-user-id header.
  // This avoids a redundant MS Graph call per POST request.
  const msUserId = request.headers.get("x-ms-user-id");
  if (!msUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const societyIdHeader = request.headers.get("x-society-id");
  const societyId = societyIdHeader ? parseInt(societyIdHeader, 10) : undefined;

  try {
    const body: NewEvent = {
      ...parsed.data,
      microsoft_id: msUserId,
      society_id: societyId,
    };
    await createEvent(body);
    return NextResponse.json(
      { message: "Event succesfully created", status: 200 },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal Server Error", status: 500 },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const rawBody = await request.json();
  const parsed = UpdateEventSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  try {
    const { id, ...updateData } = parsed.data;
    const event = await updateEvent(id, updateData);
    return event
      ? NextResponse.json(event)
      : NextResponse.json({ error: "Event not found" }, { status: 404 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Forbidden", status: 403 },
      { status: 403 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const rawBody = await request.json();
  const parsed = DeleteByIdSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  const event = await deleteEvent(parsed.data.id);
  return event
    ? NextResponse.json(event)
    : NextResponse.json({ error: "Event not found" }, { status: 404 });
}
