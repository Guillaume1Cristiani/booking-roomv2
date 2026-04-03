"use client";

import { useCalendarStore, useCalendarStoreApi } from "@/app/calendar/providers/calendar-store-provider";
import CalendarItem from "@/components/Calendar/calendaritem/calendaritem";
import CalendarItemPreview from "@/components/Calendar/previewcalendaritem/previewcalendaritem";
import LayoutDates from "@/components/Calendar/static/layoutdates";
import {
  EventsResponse,
  EventsResponseWithParentEventsDate,
  EventsWithParentsConflicts,
} from "@/components/Calendar/types/types";
import { shortPollingRevalidate } from "@/lib/revalidateTag";
import { useCalendarSSE } from "@/lib/hooks/useCalendarSSE";
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
import {
  addDays,
  addMinutes,
  addWeeks,
  getMinutes,
  isAfter,
  isBefore,
  isSameDay,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { format, formatInTimeZone, toZonedTime } from "date-fns-tz";
import { fr } from "date-fns/locale";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

function HoursBarDynamic() {
  const storeApi = useCalendarStoreApi();
  // Actions are stable references — safe to read from the React snapshot.
  const state = useCalendarStore((s) => s);
  const updatePreviewInfos = useCalendarStore(
    (state) => state.updatePreviewInfos
  );
  const updateOffsetPreview = useCalendarStore(
    (state) => state.updateOffsetPreview
  );

  function onDragEnter(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    // Always read the latest store state to avoid stale-closure issues with
    // React's render batching: multiple onDragEnter events can fire in one
    // tick before React re-renders, causing every handler to see the same
    // outdated snapshot if we use the hook value.
    const state = storeApi.getState();
    const cellDate = e.currentTarget.getAttribute("data-segment-time");
    if (cellDate === null) {
      throw new Error("cellDate is null");
    }
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
  const storeApi = useCalendarStoreApi();
  const setDragging = useCalendarStore((state) => state.setDragging);
  const updateInsetPreview = useCalendarStore(
    (state) => state.updateInsetPreview
  );
  const updatePreviewInfos = useCalendarStore(
    (state) => state.updatePreviewInfos
  );
  const dragging = useCalendarStore((state) => state.dragging);
  const state = useCalendarStore((state) => state);
  const itemCount = events.length;
  const itemWidth = 100 / itemCount;

  return (
    <div
      className={`${
        dragging.index !== idxColumn.index ? "" : "pointer-events-none"
      }
      flex-1 bg-transparent border-l-2 relative overflow-hidden`}
      onDragEnter={(e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        // Read fresh state to avoid stale closure during rapid column changes.
        const freshState = storeApi.getState();
        setDragging(idxColumn);

        if (freshState.dragging.index !== -1 && freshState.isResize === false) {
          const differencesinIdx = idxColumn.index - freshState.dragging.index;
          const start = addDays(freshState.previewInfos.dateStart, differencesinIdx);
          const end = addDays(freshState.previewInfos.dateEnd, differencesinIdx);
          updatePreviewInfos({
            dateStart: start,
            dateEnd: end,
            color: roomBackgroundFinder(
              freshState.rooms,
              Number(freshState.eventInfos.subTag_id)
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
              key={item.id}
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  useEffect(() => {
    if (window.innerWidth < 1024) {
      preview.updateViewMode("day");
      const todayIndex = preview.dates.findIndex((d) =>
        isSameDay(new Date(d), new Date())
      );
      if (todayIndex !== -1) {
        // activeDayIndex default is already 0; only update if today is visible in current week
        // navigateDayMode is for navigation; directly set via updateViewMode already done
        // We need activeDayIndex set — use a no-op direction trick or just leave at 0
        // Since store default is 0, only set if today has a different index
        if (todayIndex !== 0) {
          // Reach the right index by navigating forward
          Array.from({ length: todayIndex }).forEach(() =>
            preview.navigateDayMode(1)
          );
        }
      }
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleDays =
    preview.viewMode === "day"
      ? [preview.dates[preview.activeDayIndex] ?? preview.dates[0]]
      : preview.dates;

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollReady, setScrollReady] = useState(false);

  useLayoutEffect(() => {
    if (scrollContainerRef.current) {
      const now = new Date();
      const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
      const calendarHeight = 1440;
      const pixelOffset = (minutesSinceMidnight / 1440) * calendarHeight;
      const containerHeight = scrollContainerRef.current.clientHeight;
      // Scroll so current time sits ~1/3 from the top
      scrollContainerRef.current.scrollTop = Math.max(
        0,
        pixelOffset - containerHeight / 3
      );
      setScrollReady(true);
    }
  }, []);

  // SSE — real-time cross-session sync (<5 s latency)
  useCalendarSSE();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fallback polling every 30 s (handles SSE gaps / cache sync)
  useEffect(() => {
    const startPolling = () => {
      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => {
          shortPollingRevalidate("events");
        }, 30000);
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
    <div className="flex flex-col w-full border-2 border-b-0 flex-1 min-h-0">
      {/* Desktop header — hidden on mobile */}
      <div className="hidden lg:flex text-xl bg-white text-zinc-900 border-b-2 border-gray-300 p-2 font-medium">
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
        <button
          onClick={() => preview.resetToToday()}
          disabled={isSameDay(new Date(preview.dates[0]), startOfWeek(new Date(), { weekStartsOn: 1 }))}
          className="mr-3 px-3 py-0.5 text-sm border border-zinc-300 rounded hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-default disabled:hover:bg-transparent"
        >
          Aujourd&apos;hui
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
        {visibleDays.map((day, index) => {
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
              className="flex-1 flex flex-col border-l-2 border-gray-300 bg-white pl-2 text-zinc-900 border-b-2"
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

      <div
        ref={scrollContainerRef}
        className={`flex-1 flex overflow-scroll min-h-0 transition-opacity duration-150 ${scrollReady ? "opacity-100" : "opacity-0"}`}
      >
        <LayoutDates />
        <main
          id="calendar"
          className="h-[1440px] flex w-full relative overflow-auto"
        >
          <HoursBarDynamic />

          {visibleDays.map((day, index) => {
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
      {/* Bottom navigation — mobile only */}
      <div className="flex lg:hidden items-center justify-between bg-white border-t-2 border-gray-300 px-2 py-2 gap-2">
        {/* Prev */}
        <button
          onClick={() =>
            preview.viewMode === "day"
              ? preview.navigateDayMode(-1)
              : (preview.updateCalendarMonthDisplayDate(addWeeks(preview.dates[0], -1)),
                preview.updateDatesWithStart(addWeeks(preview.dates[0], -1)))
          }
          className="p-2 rounded-full hover:bg-zinc-100 active:bg-zinc-200"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>

        {/* Current date label */}
        <span className="flex-1 text-center text-sm font-semibold text-zinc-900 capitalize">
          {preview.viewMode === "day"
            ? formatInTimeZone(
                preview.dates[preview.activeDayIndex] ?? preview.dates[0],
                timezone,
                "EEEE d MMMM",
                { locale: fr }
              )
            : `${formatInTimeZone(preview.dates[0], timezone, "d", { locale: fr })} – ${formatInTimeZone(
                preview.dates[preview.dates.length - 1],
                timezone,
                "d MMM y",
                { locale: fr }
              )}`}
        </span>

        {/* View toggle */}
        <div className="flex rounded-lg border border-zinc-300 overflow-hidden text-xs font-medium">
          <button
            onClick={() => preview.updateViewMode("day")}
            className={`px-3 py-1.5 transition-colors ${
              preview.viewMode === "day"
                ? "bg-zinc-800 text-white"
                : "bg-white text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            Jour
          </button>
          <button
            onClick={() => preview.updateViewMode("week")}
            className={`px-3 py-1.5 border-l border-zinc-300 transition-colors ${
              preview.viewMode === "week"
                ? "bg-zinc-800 text-white"
                : "bg-white text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            Sem.
          </button>
        </div>

        {/* Next */}
        <button
          onClick={() =>
            preview.viewMode === "day"
              ? preview.navigateDayMode(1)
              : (preview.updateCalendarMonthDisplayDate(addWeeks(preview.dates[0], +1)),
                preview.updateDatesWithStart(addWeeks(preview.dates[0], +1)))
          }
          className="p-2 rounded-full hover:bg-zinc-100 active:bg-zinc-200"
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default Calendar;
