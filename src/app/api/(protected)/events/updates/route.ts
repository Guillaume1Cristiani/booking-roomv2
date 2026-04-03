export const dynamic = "force-dynamic";

import { db, ssePool } from "@/db";
import { Events, User } from "@/db/schema";
import { EventsResponse } from "@/components/Calendar/types/types";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type ServerSentEvent =
  | { type: "ping" }
  | { type: "insert" | "update"; event: EventsResponse & { user: typeof User.$inferSelect } }
  | { type: "delete"; event: { id: number } };

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  // Use the dedicated SSE pool so long-lived LISTEN connections do not
  // exhaust slots in the shared API pool.
  const client = await ssePool.connect();
  client.setMaxListeners(500);
  let streamClosed = false;

  const cleanup = async () => {
    if (!streamClosed) {
      streamClosed = true;
      await client.query("UNLISTEN event_changes");
      client.release();
    }
  };

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: ServerSentEvent) => {
        if (
          !streamClosed &&
          controller?.desiredSize !== null &&
          controller?.desiredSize > 0
        ) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        }
      };

      try {
        await client.query("LISTEN event_changes");

        client.on("notification", async (msg) => {
          if (streamClosed) return;

          const payload = JSON.parse(msg.payload as string);

          let eventData;
          if (payload.operation === "DELETE") {
            eventData = { id: payload.id };
          } else {
            const rows = await db
              .select()
              .from(Events)
              .innerJoin(User, eq(User.microsoft_id, Events.microsoft_id))
              .where(eq(Events.id, payload.id))
              .limit(1);

            const row = rows[0];
            eventData = row
              ? { ...row.events, user: row.users }
              : { id: payload.id };
          }

          sendEvent({
            type: payload.operation.toLowerCase(),
            event: eventData,
          });
        });

        // Keep-alive ping every 15 s — also detects dead clients:
        // if enqueue throws (stream closed), we clean up immediately.
        const pingIntervalId = setInterval(async () => {
          try {
            sendEvent({ type: "ping" });
          } catch {
            clearInterval(pingIntervalId);
            await cleanup();
          }
        }, 15000);

        // https://github.com/vercel/next.js/discussions/48682 — abort signal
        // doesn't fire reliably in Next.js 14; clean up on best-effort basis.
        request.signal.addEventListener("abort", async () => {
          clearInterval(pingIntervalId);
          await cleanup();
        });
      } catch (error) {
        console.error("Error setting up SSE listener:", error);
        await cleanup();
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
