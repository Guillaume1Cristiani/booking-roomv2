import type { Booking, Room } from "@/app/types";
import { apiHandler } from "../utils/apiHandler";

export const fetchAllRooms = async (): Promise<Room[]> => {
  const allRoomsRes = await apiHandler("/availablerooms");
  console.log(allRoomsRes);
  return allRoomsRes;
};

export const fetchReservations = async (): Promise<{ events: Booking[] }> => {
  const reservedRes = await apiHandler("/availability");
  return reservedRes;
};

export const mergeRoomsAndReservations = (
  allRooms: Room[],
  reservedData: { events: Booking[] }
): (Booking & { name: string; color: string })[] => {
  return allRooms.map((room: Room) => {
    if (!reservedData?.events) {
      return {
        title: "",
        status: false,
        startTime: "",
        endTime: "",
        owner: "",
        subtag_id: room.tag_id,
        name: room.name,
        color: room.color,
      };
    }
    const reservation = reservedData.events.find(
      (ev: Booking) => ev.subtag_id === room.tag_id
    );
    if (reservation) {
      return {
        ...reservation,
        name: room.name,
        color: room.color,
      };
    }
    return {
      title: "",
      status: false,
      startTime: "",
      endTime: "",
      owner: "",
      subtag_id: room.tag_id,
      name: room.name,
      color: room.color,
    };
  });
};
