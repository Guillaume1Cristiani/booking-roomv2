export const dynamic = "force-dynamic";

import { db, pool } from "@/db";
import { Events, User } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const client = await pool.connect();
  client.setMaxListeners(500);
  let streamClosed = false; // Flag to track if the stream is already closed

  const cleanup = async () => {
    if (!streamClosed) {
      streamClosed = true; // Mark stream as closed
      await client.query("UNLISTEN event_changes");
      client.release(); // Release client connection
    }
  };

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        if (
          !streamClosed &&
          controller?.desiredSize !== null &&
          controller?.desiredSize > 0
        ) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        } else {
        }
      };

      try {
        await client.query("LISTEN event_changes");

        client.on("notification", async (msg) => {
          if (streamClosed) {
            return; // Skip if stream is closed
          }

          const payload = JSON.parse(msg.payload as string);

          let eventData;
          if (payload.operation === "DELETE") {
            eventData = { id: payload.id };
          } else {
            const [event] = await db
              //@ts-ignore
              .select({ ...Events, user: User })
              .from(Events)
              .innerJoin(User, eq(User.microsoft_id, Events.microsoft_id))
              .where(eq(Events.id, payload.id))
              .limit(1);

            eventData = event || { id: payload.id };
          }

          sendEvent({
            type: payload.operation.toLowerCase(),
            event: eventData,
          });
        });

        // Keep-alive ping
        const pingIntervalId = setInterval(() => {
          sendEvent({ type: "ping" });
        }, 30000);

        // Cleanup function for when the response is closed
        // https://github.com/vercel/next.js/discussions/48682 addEventListener("abort") doesn't work in next:14.2.3
        // keep it until it works
        request.signal.addEventListener("abort", async () => {
          clearInterval(pingIntervalId);
          await cleanup();
          // controller.close(); // Close the stream
        });
      } catch (error) {
        console.error("Error setting up event listener:", error);
        await cleanup();
        controller.close(); // Close the stream
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
