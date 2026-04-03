import { Room } from "@/components/Calendar/types/types";

/** Returns the room's hex color, or a neutral default. */
export const roomBackgroundFinder = (rooms: Room[], subTag_id: Number): string => {
  const room = rooms.find((value: Room) => value.id === subTag_id);
  return room?.color ?? "#e2e8f0"; // slate-200 fallback
};
