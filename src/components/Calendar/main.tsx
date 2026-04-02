"use client";

import { useCalendarStore } from "@/app/calendar/providers/calendar-store-provider";
import CalendarItem from "@/components/Calendar/calendaritem/calendaritem";
import CalendarItemPreview from "@/components/Calendar/previewcalendaritem/previewcalendaritem";
import LayoutDates from "@/components/Calendar/static/layoutdates";
import {
  EventsResponse,
  EventsResponseWithParentEventsDate,
  EventsWithParentsConflicts,
} from "@/components/Calendar/types/types";
import { shortPollingRevalidate } from "@/lib/revalidateTag";
import { roomBackgroundFinder } from "@/lib/roomFinder";
import {
  concateDateWithString,
  getCurrentTimePercentage,
  replaceDate,
  sanitizeConflictsEventOfSameDay,
  transformDatestoProperTimeZone,
  transformStringtoInset,
} from "@/lib/time";
import { useVisibilityChange } from "@/lib/useVisibilityChange";
import { UTCDate } from "@date-fns/utc";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
// import { useMouse } from "@uidotdev/usehooks";
import {
  addDays,
  addMinutes,
  addWeeks,
  getMinutes,
  isAfter,
  isBefore,
  isSameDay,
  startOfDay,
} from "date-fns";
import { format, formatInTimeZone, toZonedTime } from "date-fns-tz";
import { fr } from "date-fns/locale";
import { useEffect, useRef } from "react";

function HoursBarDynamic() {
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (targetRef.current) {
      targetRef.current.scrollIntoView({ behavior: "instant" });
    }
  }, []);
  //   const updateInsetY = useCalendarStore((state) => state.updateInsetY);
  const updateInsetPreview = useCalendarStore(
    (state) => state.updateInsetPreview
  );
  const updatePreviewInfos = useCalendarStore(
    (state) => state.updatePreviewInfos
  );
  const updateOffsetPreview = useCalendarStore(
    (state) => state.updateOffsetPreview
  );
  const state = useCalendarStore((state) => state);
  function onDragEnter(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const cellDate = e.currentTarget.getAttribute("data-segment-time");
    if (cellDate === null) {
      throw new Error("cellDate is null");
    }
    const current = new UTCDate(cellDate);
    if (state.onDragChildStart.cellStart === "" && state.isResize === false) {
      const childDateStart = replaceDate(cellDate, state.dragging.currentDate);
      state.updateOnDragChildStart(childDateStart, {
        dateStart: state.eventInfos.dateStart,
        dateEnd: state.eventInfos.dateEnd,
      });
      updateOffsetPreview({ offSetTop: 0, offSetBottom: 0 });
    } else {
      if (!state.isResize) {
        const childDateStart = replaceDate(
          cellDate,
          state.dragging.currentDate
        );
        const utcDate = toZonedTime(childDateStart, "UTC");

        const diffMinutes =
          utcDate.getHours() * 60 +
          utcDate.getMinutes() -
          (toZonedTime(state.onDragChildStart.cellStart, "UTC").getHours() *
            60 +
            toZonedTime(state.onDragChildStart.cellStart, "UTC").getMinutes());
        //   if (state.offset !== diffMinutes) {
        state.updateOffsetY(diffMinutes);
        const start = addMinutes(
          state.previewInfos.dateStart,
          diffMinutes < 0 ? diffMinutes : Math.abs(diffMinutes)
        );
        const end = addMinutes(
          state.previewInfos.dateEnd,
          diffMinutes > 0 ? diffMinutes : diffMinutes
        );
        updatePreviewInfos({
          dateStart: start,
          dateEnd: end,
          color: roomBackgroundFinder(
            state.rooms,
            Number(state.eventInfos.subTag_id)
          ),
        });
        state.updateOnDragChildStart(childDateStart, {
          dateStart: state.eventInfos.dateStart,
          dateEnd: state.eventInfos.dateEnd,
        });
      } else {
        const childDateStart = replaceDate(
          cellDate,
          state.dragging.currentDate
        );
        const utcDate = toZonedTime(childDateStart, "UTC");
        if (state.isResize === "up") {
          if (!isAfter(utcDate, state.previewInfos.dateEnd))
            updatePreviewInfos({
              dateStart: utcDate,
              dateEnd: state.previewInfos.dateEnd,
              color: roomBackgroundFinder(
                state.rooms,
                Number(state.eventInfos.subTag_id)
              ),
            });
          else
            updatePreviewInfos({
              dateStart: state.previewInfos.dateEnd,
              dateEnd: state.previewInfos.dateEnd,
              color: roomBackgroundFinder(
                state.rooms,
                Number(state.eventInfos.subTag_id)
              ),
            });
        } else if (state.isResize === "down") {
          if (!isBefore(utcDate, state.previewInfos.dateStart)) {
            updatePreviewInfos({
              dateStart: state.previewInfos.dateStart,
              dateEnd: addMinutes(utcDate, 30),
              color: roomBackgroundFinder(
                state.rooms,
                Number(state.eventInfos.subTag_id)
              ),
            });
          } else
            updatePreviewInfos({
              dateStart: state.previewInfos.dateStart,
              dateEnd: state.previewInfos.dateStart,
              color: roomBackgroundFinder(
                state.rooms,
                Number(state.eventInfos.subTag_id)
              ),
            });
        } else {
          console.error("Anormal Behavior detected on Resize");
        }
        state.updateOnDragChildStart(childDateStart, {
          dateStart: state.eventInfos.dateStart,
          dateEnd: state.eventInfos.dateEnd,
        });
      }
    }
  }

  const divsPerDay = 2;
  const totalDivs = 24 * divsPerDay;

  // Generate divs with calculated styles
  const segments = Array.from({ length: totalDivs }, (_, index) => {
    const top = `${(index / totalDivs) * 100}%`;
    const bottom = `${((totalDivs - index - 1) / totalDivs) * 100}%`;
    const startTime = addMinutes(
      startOfDay(new Date(2019, 8, 18, 19, 0, 52)),
      index * 30
    );
    const minutes = getMinutes(startTime);
    const formattedTime = format(startTime, "yyyy-MM-dd'T'HH:mm:ss'Z'");
    return {
      top,
      bottom,
      formattedTime,
      segmentStyle: minutes !== 30 ? "dashed" : "solid",
    };
  });

  return (
    <>
      {segments.map((segment, index) => (
        <div
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onContextMenu={(e) => e.preventDefault()}
          onMouseOver={(e) => {
            e.preventDefault();
            if (state.isNewPreviewDisplay) {
              if (state.createPreviewInfos.origin === "") {
                state.updateCreatePreviewInfos({
                  dates: {
                    dateStart: toZonedTime(segment.formattedTime, "UTC"),
                    dateEnd: addMinutes(
                      toZonedTime(segment.formattedTime, "UTC"),
                      30
                    ),
                  },
                  origin: toZonedTime(segment.formattedTime, "UTC"),
                });
              } else {
                //is dateStart after dateEnd
                if (
                  isAfter(
                    state.createPreviewInfos.origin,
                    toZonedTime(segment.formattedTime, "UTC")
                  )
                ) {
                  state.updateCreatePreviewInfos({
                    ...state.createPreviewInfos,
                    dates: {
                      dateStart: addMinutes(
                        toZonedTime(segment.formattedTime, "UTC"),
                        0
                      ),
                      dateEnd: addMinutes(state.createPreviewInfos.origin, 30),
                    },
                  });
                } else {
                  state.updateCreatePreviewInfos({
                    ...state.createPreviewInfos,
                    dates: {
                      dateStart: addMinutes(state.createPreviewInfos.origin, 0),
                      dateEnd: addMinutes(
                        toZonedTime(segment.formattedTime, "UTC"),
                        30
                      ),
                    },
                  });
                }
              }
            }
            // state.createPreviewInfos({ dateStart: toZonedTime(segment.formattedTime, "UTC"), dateEnd:  });
          }}
          onMouseUp={() => {
            const datePart = state.dragging.currentDate;
            const timePartStart = state.createPreviewInfos.dates.dateStart;
            const timePartEnd = state.createPreviewInfos.dates.dateEnd;

            const dateStartUpdatedStart = concateDateWithString(
              timePartStart,
              datePart
            );
            const dateStartUpdatedEnd = concateDateWithString(
              timePartEnd,
              datePart
            );
            const newDate: EventsResponse = {
              id: -42,
              name: "",
              description: "",
              dateStart: dateStartUpdatedStart.toString(),
              dateEnd: dateStartUpdatedEnd.toString(),
              subTag_id: -1,
              microsoft_id: "local",
              createdAt: "",
              updatedAt: "",
            };

            state.addTransformedAllEvents(
              transformDatestoProperTimeZone([newDate])
            );
            state.updateIsNewPreviewDisplay(false);
            state.setDragging({ total: 5, index: -1, currentDate: "" });
            state.updateCreatePreviewInfos({
              dates: { dateStart: "", dateEnd: "" },
              origin: "",
            });
          }}
          key={index}
          data-segment-time={segment.formattedTime}
          onDragEnter={onDragEnter}
          ref={
            segment.formattedTime === "2019-09-18T08:00:00Z" ? targetRef : null
          }
          className=" inset-x-0 h-[30px] border-b-2 border-grey-300 bg-white absolute select-none"
          style={
            {
              top: segment.top,
              bottom: segment.bottom,
              borderBottomStyle: segment.segmentStyle,
            } as React.CSSProperties
          }
        ></div>
      ))}
    </>
  );
}

function CalendarDay({
  events,
  idxColumn,
}: {
  events: EventsWithParentsConflicts[];
  idxColumn: { total: number; index: number; currentDate: string };
}) {
  const updateInsetPreview = useCalendarStore(
    (state) => state.updateInsetPreview
  );
  const setDragging = useCalendarStore((state) => state.setDragging);
  const dragging = useCalendarStore((state) => state.dragging);
  const state = useCalendarStore((state) => state);
  const updatePreviewInfos = useCalendarStore(
    (state) => state.updatePreviewInfos
  );
  const itemCount = events.length;
  const itemWidth = 100 / itemCount;

  return (
    <div
      className={`${
        dragging.index !== idxColumn.index ? "" : "pointer-events-none"
      }
      basis-[20%] bg-transparent border-l-2 relative overflow-hidden`}
      onDragEnter={(e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragging(idxColumn);

        if (dragging.index !== -1 && state.isResize === false) {
          const differencesinIdx = idxColumn.index - dragging.index;
          const start = addDays(state.previewInfos.dateStart, differencesinIdx);
          const end = addDays(state.previewInfos.dateEnd, differencesinIdx);
          updatePreviewInfos({
            dateStart: start,
            dateEnd: end,
            color: roomBackgroundFinder(
              state.rooms,
              Number(state.eventInfos.subTag_id)
            ),
          });
        }
      }}
      onMouseUp={() => {
        setDragging({ total: 5, index: -1, currentDate: "" });
        state.updateCreatePreviewInfos({
          dates: { dateStart: "", dateEnd: "" },
          origin: "",
        });
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        if (state.user.role === "ADMIN" || state.user.role === "EDITOR") {
          setDragging(idxColumn);
          state.updateIsNewPreviewDisplay(true);
        }
      }}
    >
      <div className="absolute right-[10px] bottom-0 top-0 left-0">
        {events.map((item, index) => {
          // const leftPercentage = index * itemWidth;
          // const rightPercentage = 100 - (index + 1) * itemWidth;
          return (
            <CalendarItem
              idxColumn={idxColumn}
              eventInfos={item}
              key={index}
              conflictInsetsX={{
                left: `${item.leftPercentage}%`,
                right: `${item.rightPercentage}%`,
              }}
              isEditable={
                state.user.role !== "VIEWER" &&
                (item.microsoft_id === state.user.microsoft_id ||
                  item.microsoft_id === "local") // In case it's created locally (on creating the event)
              }
            />
          );
        })}
      </div>
      {state.createPreviewInfos && state.dragging.index === idxColumn.index && (
        <div
          className="absolute z-10 bg-blue-300"
          style={{
            ...transformStringtoInset(
              state.createPreviewInfos.dates.dateStart,
              state.createPreviewInfos.dates.dateEnd
            ),
          }}
        ></div>
      )}
      <div style={{ inset: 0, position: "absolute", zIndex: -1 }}></div>
    </div>
  );
}

function Calendar({
  events,
}: {
  events: EventsResponseWithParentEventsDate[];
}) {
  const documentVisible = useVisibilityChange();
  const preview = useCalendarStore((state) => state);

  useEffect(() => {
    preview.updateTransformedAllEvents(events);
  }, [events]);
  const daysOfWeek = preview.dates;

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const startPolling = () => {
      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => {
          shortPollingRevalidate("events");
        }, 15000);
      }
    };

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    if (documentVisible) {
      startPolling();
    } else {
      stopPolling();
    }

    // Cleanup when component unmounts or before re-running effect
    return () => {
      stopPolling();
    };
  }, [documentVisible]);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="flex flex-col w-full border-2 border-b-0">
      <div className="flex text-xl bg-white text-zinc-900 border-b-2 border-gray-300 p-2 font-medium">
        <button
          className="mr-3"
          onClick={() => {
            preview.updateCalendarMonthDisplayDate(
              addWeeks(preview.dates[0], -1)
            );
            preview.updateDatesWithStart(addWeeks(preview.dates[0], -1));
          }}
        >
          <ChevronLeftIcon />
        </button>
        <button
          className="mr-3"
          onClick={() => {
            preview.updateCalendarMonthDisplayDate(
              addWeeks(preview.dates[0], +1)
            );
            preview.updateDatesWithStart(addWeeks(preview.dates[0], +1));
          }}
        >
          <ChevronRightIcon />
        </button>
        {formatInTimeZone(preview.dates[0], timezone, "dd MMMM- ", {
          locale: fr,
        })}
        {formatInTimeZone(
          preview.dates[preview.dates.length - 1],
          timezone,
          "dd MMMM y",
          {
            locale: fr,
          }
        )}
      </div>
      <div className="flex">
        <div className="w-[48px] flex-shrink-0 bg-white divide-x border-gray-300 border-b-2" />
        {daysOfWeek.map((day, index) => {
          const daysofWeekCurrent = new Date(day);
          const isCurrentDay = isSameDay(daysofWeekCurrent, new Date());
          const styleTime = `text-lg ${
            isCurrentDay
              ? "bg-red-500 w-7 rounded-full text-center block text-stone-50"
              : ""
          }`;
          return (
            <div
              key={index}
              className="basis-1/5 flex flex-col border-l-2 border-gray-300 bg-white pl-2 text-zinc-900 border-b-2"
            >
              <div className="capitalize text-sm">
                {formatInTimeZone(daysofWeekCurrent, timezone, "iiii", {
                  locale: fr,
                })}
              </div>
              <div className="rounded">
                <time className={styleTime}>
                  {formatInTimeZone(daysofWeekCurrent, timezone, "dd", {
                    locale: fr,
                  })}
                </time>
              </div>
            </div>
          );
        })}
      </div>

      <div className="h-[85vh] flex overflow-scroll">
        <LayoutDates />
        <main
          id="calendar"
          className="h-[1440px] flex w-full relative overflow-auto"
        >
          <HoursBarDynamic />

          {daysOfWeek.map((day, index) => {
            const allEventsTransformedCopy = preview.transformedAllEvents;
            const dayEvents: EventsResponseWithParentEventsDate[] =
              allEventsTransformedCopy.filter(
                (event: EventsResponseWithParentEventsDate) => {
                  const isRoomWanted = !preview.unwantedRooms.has(
                    Number(event.subTag_id)
                  );
                  const isSameDayBool = isSameDay(
                    new Date(event.dateStart),
                    new Date(day)
                  );
                  if (
                    event.id === -42 &&
                    event.subTag_id === -1 &&
                    isSameDayBool
                  )
                    return true;

                  return isSameDayBool && isRoomWanted === true;
                }
              );

            const sanitizeDayEvents =
              sanitizeConflictsEventOfSameDay(dayEvents);

            return (
              <CalendarDay
                key={index}
                idxColumn={{ total: 5, index, currentDate: day }}
                events={sanitizeDayEvents}
              />
            );
          })}
          <div
            className="absolute left-[1px] right-0 pointer-events-none"
            style={{ top: getCurrentTimePercentage() }}
          >
            {/* <div className="border-2 border-blue-800 border-dashed" />
             */}
            <div className="h-[1px] w-full  bg-blue-500" />
            <div className="relative left-[-7px] top-[-7px] w-3 h-3 rounded-full bg-blue-800 z-20"></div>
          </div>
          {/* Preview */}
          {preview.isPreviewDisplay === true && (
            <CalendarItemPreview inset={preview.previewInfos} />
          )}
          {/* <div
            style={{
              position: "absolute",
              top: mouse.y,
              left: mouse.x,
              zIndex: 40,
              backgroundColor: "purple",
            }}
          >
            <p>
              {isValid(preview.previewInfos.dateStart)
                ? format(
                    new Date(preview.previewInfos.dateStart),
                    "EEEE, dd HH:mm"
                  )
                : ""}{" "}
              {isValid(preview.previewInfos.dateEnd)
                ? format(
                    new Date(preview.previewInfos.dateEnd),
                    "EEEE, dd HH:mm"
                  )
                : ""}
            </p>
            <p>
              {preview.createPreviewInfos.dates.dateStart !== ""
                ? format(
                    new Date(preview.createPreviewInfos.dates.dateStart),
                    "EEEE, dd HH:mm"
                  )
                : ""}{" "}
              {preview.createPreviewInfos.dates.dateEnd !== ""
                ? " " +
                  format(
                    new Date(preview.createPreviewInfos.dates.dateEnd),
                    "EEEE, dd HH:mm"
                  )
                : ""}
            </p>
          </div> */}
        </main>
      </div>
    </div>
  );
}

export default Calendar;
