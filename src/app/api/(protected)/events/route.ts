import { Events, NewEvent, User } from "@/db/schema";
import { db } from "@/lib/db";
import { createEvent, deleteEvent, updateEvent } from "@/lib/event";
import { handleRouteError, newCorrelationId, NotFoundError } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { CreateEventSchema, DeleteByIdSchema, UpdateEventSchema } from "@/lib/schemas";
import { and, eq, gte, lte } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

function isValidDateString(dateString: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(dateString);
}

export async function GET(request: NextRequest) {
  const correlationId = newCorrelationId();
  const { searchParams } = new URL(request.url);
  const dateStart = searchParams.get("dateStart");
  const dateEnd = searchParams.get("dateEnd");
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
        { error: "Invalid date format. Use ISO 8601 (YYYY-MM-DDTHH:mm:ss.mmmZ).", correlationId },
        { status: 400 }
      );
    }

    const events = rows.map((row) => ({ ...row.events, user: row.users }));

    return NextResponse.json(events);
  } catch (error) {
    return handleRouteError(error, correlationId, "GET /events");
  }
}

export async function POST(request: NextRequest) {
  const correlationId = newCorrelationId();
  const rawBody = await request.json();
  const parsed = CreateEventSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten(), correlationId }, { status: 422 });
  }

  const msUserId = request.headers.get("x-ms-user-id");
  if (!msUserId) {
    return NextResponse.json({ error: "Unauthorized", correlationId }, { status: 401 });
  }

  const societyIdHeader = request.headers.get("x-society-id");
  const societyId = societyIdHeader ? parseInt(societyIdHeader, 10) : undefined;

  try {
    const body: NewEvent = {
      ...parsed.data,
      microsoft_id: msUserId,
      society_id: societyId,
    };
    const created = await createEvent(body);
    const user = await db.query.User.findFirst({
      where: eq(User.microsoft_id, msUserId),
    });
    void logAudit({
      action: "create",
      resource: "event",
      resourceId: created.id,
      userId: msUserId,
      societyId,
      metadata: parsed.data,
    });
    return NextResponse.json({ ...created, user: user ?? null }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, correlationId, "POST /events");
  }
}

export async function PUT(request: NextRequest) {
  const correlationId = newCorrelationId();
  const rawBody = await request.json();
  const parsed = UpdateEventSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten(), correlationId }, { status: 422 });
  }
  try {
    const { id, ...updateData } = parsed.data;
    const event = await updateEvent(id, updateData);
    if (!event) throw new NotFoundError("Event");
    void logAudit({
      action: "update",
      resource: "event",
      resourceId: id,
      userId: request.headers.get("x-ms-user-id"),
      societyId: request.headers.get("x-society-id") ? parseInt(request.headers.get("x-society-id")!, 10) : null,
      metadata: updateData,
    });
    return NextResponse.json(event);
  } catch (error) {
    return handleRouteError(error, correlationId, "PUT /events");
  }
}

export async function DELETE(request: NextRequest) {
  const correlationId = newCorrelationId();
  const rawBody = await request.json();
  const parsed = DeleteByIdSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten(), correlationId }, { status: 422 });
  }
  try {
    const event = await deleteEvent(parsed.data.id);
    if (!event) throw new NotFoundError("Event");
    void logAudit({
      action: "delete",
      resource: "event",
      resourceId: parsed.data.id,
      userId: request.headers.get("x-ms-user-id"),
      societyId: request.headers.get("x-society-id") ? parseInt(request.headers.get("x-society-id")!, 10) : null,
    });
    return NextResponse.json(event);
  } catch (error) {
    return handleRouteError(error, correlationId, "DELETE /events");
  }
}
