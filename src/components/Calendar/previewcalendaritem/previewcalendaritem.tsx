import { useCalendarStore } from "@/app/calendar/providers/calendar-store-provider";
import {
  calculateEventPosition,
  retrieveRoomName,
  transformDatestoProperTimeZonePreview,
  transformStringtoInset,
} from "@/lib/time";
import { UTCDate } from "@date-fns/utc";
import { isSameDay } from "date-fns";

function CalendarItemPreview({
  inset,
}: {
  inset: {
    dateStart: Date | UTCDate | "";
    dateEnd: Date | UTCDate | "";
    color: string;
  };
}) {
  const preview = useCalendarStore((state) => state);

  const transformDates = transformDatestoProperTimeZonePreview(
    inset.dateStart,
    inset.dateEnd
  );
  const retrieveIndex = (currentDate: string) => {
    const index = preview.dates.findIndex((date) => {
      return isSameDay(date, currentDate);
    });
    return index;
  };

  const newInsetsArray = transformDates
    .map((dateRange) => {
      const insetsY = transformStringtoInset(
        new Date(dateRange.dateStart),
        new Date(dateRange.dateEnd)
      );

      if (retrieveIndex(dateRange.dateStart) === -1) {
        return null;
      }
      return {
        ...calculateEventPosition(5, retrieveIndex(dateRange.dateStart)),
        top: insetsY.top,
        bottom: insetsY.bottom,
      };
    })
    .filter((inset) => inset !== null);

  if (newInsetsArray.length === 0) {
    return null;
  }

  const roomName = retrieveRoomName(
    preview.rooms,
    preview.eventInfos.subTag_id as number
  );

  return (
    <>
      {newInsetsArray.map((newInset, index) => (
        <div
          onMouseOver={(e) => e.stopPropagation()}
          key={index}
          className="flex"
          id={`preview-${index}`}
          style={{
            ...newInset,
            position: "absolute",
            cursor: "pointer",
            zIndex: 20,
            pointerEvents: "none",
            backgroundColor: (inset.color ?? "#94a3b8") + "99",
          }}
        >
          <div
            className="h-full min-w-1 rounded-bl-md rounded-tl-md"
            style={{ backgroundColor: inset.color ?? "#94a3b8" }}
          />
          <p className="p-t-2 px-1 overflow-hidden text-zinc-900 w-full text-wrap whitespace-nowrap">
            {roomName} {preview.eventInfos.name}
          </p>
        </div>
      ))}
    </>
  );
}

export default CalendarItemPreview;
