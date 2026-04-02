import { CalendarStoreProvider } from "@/app/calendar/providers/calendar-store-provider";
import { getAllEvents, getAllRooms } from "@/app/utils/queries";
import Calendar from "@/components/Calendar/main";
import { EventsResponse } from "@/components/Calendar/types/types";
import { CalendarPicker } from "@/components/CalendarPicker/calendarpicker";
import Profile from "@/components/Profile/Profile";
import RoomFilter from "@/components/RoomFilter/roomfilter";
import { transformDatestoProperTimeZone } from "@/lib/time";
import { getUserInfosWithMicrosoftToken } from "../utils/microsoftqueries";

export default async function calendarPage() {
  const events: EventsResponse[] = await getAllEvents();
  // const rooms: Room[] = await getAllRooms();
  // const user = await getMicrosoftUserInfos();
  const transformedEvents = transformDatestoProperTimeZone(events);
  return (
    <CalendarStoreProvider
      initialState={{
        transformedAllEvents: transformedEvents,
        rooms: await getAllRooms(),
        user: await getUserInfosWithMicrosoftToken(),
      }}
    >
      <div className="flex p-3 max-h-screen">
        <section className="flex flex-col bg-zinc-100 overflow-hidden">
          <Profile />
          <CalendarPicker />
          <div className=" border-b-2 border-zinc-200 mx-4 mb-2" />
          <RoomFilter />
        </section>
        <Calendar events={transformedEvents} />
      </div>
    </CalendarStoreProvider>
  );
}
