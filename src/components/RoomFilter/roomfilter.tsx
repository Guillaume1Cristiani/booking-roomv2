"use client";

import { useCalendarStore } from "@/app/calendar/providers/calendar-store-provider";
import { TargetIcon } from "@radix-ui/react-icons";
import * as Switch from "@radix-ui/react-switch";
import { useEffect, useState } from "react";
import { Room } from "../Calendar/types/types";
import "./styles.css";

const RoomSelectorItem = ({ room }: { room: Room }) => {
  const updateRoom = useCalendarStore((state) => state.updateUnwantedRoom);
  const unwantedRooms = useCalendarStore((state) => state.unwantedRooms);
  const [isOn, setisOn] = useState<"checked" | "unchecked">("checked");
  const roomPrimary = room.color + "-300";

  useEffect(() => {
    if (unwantedRooms.has(room.id)) setisOn("unchecked");
    else setisOn("checked");
  }, [unwantedRooms, room]);

  const handleOnlySelectOne = (e: any) => {
    e.stopPropagation();
    updateRoom([room]);
  };

  return (
    <div
      onClick={(e) => {
        if (isOn === "checked") setisOn("unchecked");
        else setisOn("checked");
        updateRoom(room);
      }}
      className="flex items-center gap-3 rounded hover:bg-gray-300 active:bg-stone-300 justify-between group"
    >
      <div className="flex gap-2">
        <Switch.Root
          data-state={isOn}
          defaultChecked={true}
          className={`w-[42px] h-[25px] rounded-full relative touch-none ${
            isOn === "checked" ? roomPrimary : " bg-gray-400"
          }`}
          id="airplane-mode"
        >
          <Switch.Thumb className="SwitchThumb" data-state={isOn} />
        </Switch.Root>
        <label
          className="Label text-zinc-900 select-none"
          onClick={(e) => e.preventDefault()}
          htmlFor="airplane-mode"
          style={{ paddingRight: 15 }}
        >
          {room.name}
        </label>
      </div>
      <button
        onClick={handleOnlySelectOne}
        className="rounded hover:bg-gray-400 active:bg-stone-300 mr-2 hidden group-hover:block"
        title="Afficher uniquement"
      >
        <TargetIcon />
      </button>
    </div>
  );
};

const RoomFilter = () => {
  const storeRooms = useCalendarStore((state) => state.rooms);
  const updateRoom = useCalendarStore((state) => state.updateUnwantedRoom);

  return (
    <>
      <div
        onClick={(e) => {
          updateRoom("reset");
        }}
        className="flex items-center gap-3 rounded hover:bg-gray-300 active:bg-stone-300 justify-between text-zinc-900 cursor-pointer"
      >
        Réinitialiser les filtres
      </div>
      <div className="flex-grow overflow-scroll">
        <div className="h-full overflow-y-auto text-zinc-900 max-h-min">
          <div className="flex flex-col gap-1 mt-2">
            {storeRooms.map((item: Room) => (
              <RoomSelectorItem key={item.id} room={item} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default RoomFilter;
