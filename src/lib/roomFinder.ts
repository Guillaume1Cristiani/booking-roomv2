import { Room } from "@/components/Calendar/types/types";

export const roomBackgroundFinder = (rooms: Room[], subTag_id: Number) => {
  const index = rooms.findIndex((value: Room) => value.tag_id === subTag_id);
  if (index === -1) return "bg-slate-50";
  return rooms[index].color;
};
