// src/lib/events.ts
import { Event, Events, NewEvent, Rooms, User } from "@/db/schema";
import { and, eq, gt, lt, ne } from "drizzle-orm";
import { ConflictError, NotFoundError } from "./errors";
import { db } from "./db";
// Create
export async function createEvent(event: NewEvent): Promise<Event> {
  const conflictingEvents = await db
    .select()
    .from(Events)
    .where(
      and(
        eq(Events.subTag_id, event.subTag_id),
        lt(Events.dateStart, event.dateEnd),
        gt(Events.dateEnd, event.dateStart)
      )
    );

  if (conflictingEvents.length > 0) {
    const conflictingEvent = conflictingEvents[0];
    const room = await db.query.Rooms.findFirst({
      where: eq(Rooms.id, conflictingEvent.subTag_id),
    });
    const user = await db.query.User.findFirst({
      where: eq(User.microsoft_id, conflictingEvent.microsoft_id),
    });
    throw new ConflictError(
      `La salle ${room?.name || "inconnue"} est déjà réservée par ${
        `${user?.givenName} ${user?.surname}` || "un utilisateur"
      } du ${conflictingEvent.dateStart} au ${conflictingEvent.dateEnd}.`
    );
  }
  const [createdEvent] = await db.insert(Events).values(event).returning();
  return createdEvent;
}

// Read (Get all)
export async function getAllEvents(): Promise<Event[]> {
  return db.select().from(Events);
}

// Read (Get one)
export async function getEventById(id: number): Promise<Event | null> {
  const [event] = await db.select().from(Events).where(eq(Events.id, id));
  return event || null;
}

export async function getEventByDay(
  eventId: number,
  dateStart: string,
  dateEnd: string
) {
  if (eventId !== -42) {
    const targetEvent = await db
      .select()
      .from(Events)
      .where(eq(Events.id, eventId))
      .limit(1);

    // If no event found, return null or throw an error
    if (targetEvent.length === 0) {
      return null; // or throw new Error('Event not found');
    }

    const { dateStart, dateEnd } = targetEvent[0];
    // Now, find overlapping events
    const overlappingEvents = await db
      .select()
      .from(Events)
      .where(
        and(
          ne(Events.id, eventId), // Exclude the target event itself
          lt(Events.dateStart, dateEnd),
          gt(Events.dateEnd, dateStart)
        )
      );
    return overlappingEvents;
  } else {
    const formattedDateStart = dateStart;
    const formattedDateEnd = dateEnd;

    const conflictingEvents = await db
      .select()
      .from(Events)
      .where(
        and(
          lt(Events.dateStart, formattedDateEnd),
          gt(Events.dateEnd, formattedDateStart)
        )
      );
    return conflictingEvents;
  }
}

// Update
export async function updateEvent(
  id: number,
  event: Partial<NewEvent>
): Promise<Event | null> {
  // First, get the existing event
  const existingEvent = await db
    .select()
    .from(Events)
    .where(eq(Events.id, id))
    .limit(1);

  if (!existingEvent.length) {
    throw new NotFoundError("Event");
  }

  // Merge existing event with updates
  const updatedEventData = { ...existingEvent[0], ...event };

  // Check for conflicts
  const conflictingEvents = await db
    .select()
    .from(Events)
    .where(
      and(
        ne(Events.id, id), // Exclude the current event
        eq(Events.subTag_id, updatedEventData.subTag_id),
        lt(Events.dateStart, updatedEventData.dateEnd),
        gt(Events.dateEnd, updatedEventData.dateStart)
      )
    );

  if (conflictingEvents.length > 0) {
    const conflictingEvent = conflictingEvents[0];
    const room = await db.query.Rooms.findFirst({
      where: eq(Rooms.id, conflictingEvent.subTag_id),
    });
    const user = await db.query.User.findFirst({
      where: eq(User.microsoft_id, conflictingEvent.microsoft_id),
    });

    throw new ConflictError(
      `La salle ${room?.name || "inconnue"} est déjà réservée par ${
        `${user?.givenName} ${user?.surname}` || "un utilisateur"
      } du ${conflictingEvent.dateStart} au ${conflictingEvent.dateEnd}.`
    );
  }

  // If no conflicts, update the event
  const [updatedEvent] = await db
    .update(Events)
    .set({ ...event, updatedAt: new Date() })
    .where(eq(Events.id, id))
    .returning();

  return updatedEvent || null;
}

// Delete
export async function deleteEvent(id: number): Promise<Event> {
  const [deletedEvent] = await db
    .delete(Events)
    .where(eq(Events.id, id))
    .returning();
  return deletedEvent;
}
