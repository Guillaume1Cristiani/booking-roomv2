// app/available/page.tsx
import {
  fetchAllRooms,
  fetchReservations,
  mergeRoomsAndReservations,
} from "@/app/data/rooms";
import type { Room } from "@/app/types";
import AvailableContent from "./content";

export default async function AvailablePage({
  searchParams,
}: {
  searchParams?: { tv?: string };
}) {
  // Safe on the server even if these use next/headers
  const rooms: Room[] = await fetchAllRooms();
  const reservations: any = await fetchReservations();
  const initialData = mergeRoomsAndReservations(rooms, reservations);

  const isTv = (searchParams?.tv ?? "") === "true";

  return (
    <AvailableContent
      initialRooms={rooms}
      initialData={initialData}
      isTv={isTv}
    />
  );
}
