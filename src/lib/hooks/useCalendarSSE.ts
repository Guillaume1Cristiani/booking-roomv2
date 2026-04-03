"use client";

import { useCalendarStoreApi } from "@/app/calendar/providers/calendar-store-provider";
import { useEffect, useRef } from "react";

/**
 * Connects to /api/events/updates (SSE) and pushes DB changes directly into
 * the Zustand store so all open sessions see updates within ~1-2 s.
 * Reconnects automatically on drop (max 5 s delay between retries).
 */
export function useCalendarSSE() {
  const storeApi = useCalendarStoreApi();
  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryDelay = useRef(1000);

  useEffect(() => {
    let unmounted = false;

    const connect = () => {
      if (unmounted) return;

      const es = new EventSource("/api/events/updates");
      esRef.current = es;

      es.onopen = () => {
        retryDelay.current = 1000; // reset backoff on successful connect
      };

      es.onmessage = (e: MessageEvent) => {
        const data = JSON.parse(e.data as string);
        if (data.type === "ping") return;

        const { updateSSEdata } = storeApi.getState();

        if (data.type === "insert" || data.type === "update") {
          updateSSEdata(data.event, data.type);
        } else if (data.type === "delete") {
          updateSSEdata(data.event, "delete");
        }
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        if (!unmounted) {
          // Exponential backoff capped at 5 s
          retryRef.current = setTimeout(() => {
            retryDelay.current = Math.min(retryDelay.current * 2, 5000);
            connect();
          }, retryDelay.current);
        }
      };
    };

    connect();

    return () => {
      unmounted = true;
      if (retryRef.current) clearTimeout(retryRef.current);
      esRef.current?.close();
    };
  }, [storeApi]);
}
