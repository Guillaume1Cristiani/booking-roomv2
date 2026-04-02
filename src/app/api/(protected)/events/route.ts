import { Event, Events, NewEvent, User } from "@/db/schema";
import { db } from "@/lib/db";
import { createEvent, deleteEvent, updateEvent } from "@/lib/event";
import { CreateEventSchema, DeleteByIdSchema, UpdateEventSchema } from "@/lib/schemas";
import axios from "axios";
import { and, eq, gte, lte } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

function isValidDateString(dateString: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(dateString);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateStart = searchParams.get("dateStart");
  const dateEnd = searchParams.get("dateEnd");

  try {
    const baseQuery = db
      .select()
      .from(Events)
      .innerJoin(User, eq(User.microsoft_id, Events.microsoft_id));

    const rows = await (dateStart && dateEnd
      ? (() => {
          if (!isValidDateString(dateStart) || !isValidDateString(dateEnd)) {
            return null;
          }
          return baseQuery.where(
            and(
              gte(Events.dateStart, new Date(dateStart)),
              lte(Events.dateEnd, new Date(dateEnd))
            )
          );
        })()
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

  const microsoftToken = cookies().get("token")?.value;
  if (!microsoftToken)
    return NextResponse.json({ error: "Token Invalid" }, { status: 401 });
  try {
    const graphResponse = await axios.get(
      "https://graph.microsoft.com/v1.0/me",
      {
        headers: {
          Authorization: `Bearer ${microsoftToken}`,
        },
      }
    );
    // Overwrite microsoft_id with the value from the validated token — never trust the client.
    const body: NewEvent = { ...parsed.data, microsoft_id: graphResponse.data.id };
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
    const event = await updateEvent(parsed.data.id, parsed.data);
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
