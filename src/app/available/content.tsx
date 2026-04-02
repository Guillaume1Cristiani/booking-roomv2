"use client";

import type { Booking, Room } from "@/app/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/Table/table";
import { format } from "date-fns";
import { ReactElement, Suspense, useEffect, useMemo } from "react";
import useSWR from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: "no-store", credentials: "include" });
  const text = await res.text();
  // Defensive: ensure we actually got JSON, not an HTML error page
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON from ${url}, got:\n${text.slice(0, 200)}`);
  }
};

type AvailabilityRow = Booking & { name: string; color: string };

export default function AvailableContent({
  initialRooms, // not used below — remove if unnecessary
  initialData,
  isTv,
}: {
  initialRooms: Room[];
  initialData: AvailabilityRow[];
  isTv: boolean;
}): ReactElement {
  const { data, error, isLoading } = useSWR<
    AvailabilityRow[] | { data: AvailabilityRow[] }
  >("/api/mergeavailability", fetcher);

  // Normalize shape to an array so .filter() is always safe
  const rows = useMemo<AvailabilityRow[]>(() => {
    if (!data) return initialData ?? [];
    return Array.isArray(data) ? data : data.data ?? [];
  }, [data, initialData]);

  useEffect(() => {
    if (!isTv) return;

    const SCROLL_STEP = 1;
    const TICK_MS = 16;
    const PAUSE_MS = 10000;

    let direction: 1 | -1 = 1;
    let paused = false;
    let intervalId: NodeJS.Timeout | null = null;
    let pauseTimeout: NodeJS.Timeout | null = null;

    const atBottom = () =>
      window.scrollY + window.innerHeight >=
      (document.documentElement.scrollHeight || document.body.scrollHeight) - 1;

    const atTop = () => window.scrollY <= 0;

    const tick = () => {
      if (paused) return;

      if (direction === 1 && atBottom()) {
        paused = true;
        pauseTimeout = setTimeout(() => {
          direction = -1;
          paused = false;
        }, PAUSE_MS);
        return;
      }
      if (direction === -1 && atTop()) {
        paused = true;
        pauseTimeout = setTimeout(() => {
          direction = 1;
          paused = false;
        }, PAUSE_MS);
        return;
      }

      window.scrollBy(0, SCROLL_STEP * direction);
    };

    intervalId = setInterval(tick, TICK_MS);

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (pauseTimeout) clearTimeout(pauseTimeout);
    };
  }, [isTv]);

  if (error) return <h1>An error has occurred.</h1>;
  if (isLoading && !rows.length) return <p>Loading...</p>;

  // Auto-scroll loop (down → wait 10s → up → wait 10s)

  const formatDate = (dateString: string, formatString: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return format(date, formatString);
  };

  const renderTableRows = (list: AvailabilityRow[]) =>
    list.map((room, index) => (
      <TableRow key={index} className={room.color}>
        <TableCell className="w-1/3 font-medium text-4xl text-center text-black">
          {room.name}
        </TableCell>
        <TableCell>
          <div
            className={`text-center py-3 px-4 rounded-md font-medium text-white text-4xl ${
              room.status ? "bg-red-500" : "bg-green-500"
            }`}
          >
            {room.status ? (
              <>
                Occupée{" "}
                <span className="text-4xl font-medium text-white">
                  (de {formatDate(room.startTime, "HH:mm")} à{" "}
                  {formatDate(room.endTime, "HH:mm")})
                </span>
              </>
            ) : (
              <>Libre</>
            )}
          </div>
        </TableCell>
        <TableCell className="w-1/3">
          {room.title && (
            <div className="text-black text-4xl text-center font-medium">
              {room.title}
            </div>
          )}
        </TableCell>
      </TableRow>
    ));

  return (
    <Suspense fallback={null}>
      <div className="min-h-screen flex flex-col bg-gray-100">
        <main className="flex-1 p-4">
          <div className="bg-[#0091d3] text-white p-4 text-center rounded-md shadow-md mb-4 text-xl">
            1er étage
          </div>
          <Table className="shadow-md rounded-md overflow-hidden">
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/3 text-center text-black">
                  Salle
                </TableHead>
                <TableHead className="w-1/3 text-center text-black">
                  Statut
                </TableHead>
                <TableHead className="w-1/3 text-center text-black">
                  Info
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderTableRows(
                rows.filter((room) => !room.name.startsWith("2-"))
              )}
            </TableBody>
          </Table>

          <div className="bg-[#0091d3] text-white p-4 text-center rounded-md shadow-md mt-8 mb-4 text-xl">
            2e étage
          </div>
          <Table className="shadow-md rounded-md overflow-hidden">
            <TableBody>
              {renderTableRows(
                rows.filter((room) => room.name.startsWith("2-"))
              )}
            </TableBody>
          </Table>
        </main>
      </div>
    </Suspense>
  );
}
