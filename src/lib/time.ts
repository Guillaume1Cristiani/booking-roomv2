import {
  EventsResponse,
  EventsResponseWithParentEventsDate,
  EventsWithParentsConflicts,
  Insets,
  Room,
} from "@/components/Calendar/types/types";
import { UTCDate } from "@date-fns/utc";
import {
  addDays,
  addMinutes,
  differenceInCalendarDays,
  differenceInMinutes,
  format,
  isBefore,
  isEqual,
  isSameDay,
  parseISO,
  setDate,
  setMonth,
  setYear,
  startOfDay,
} from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

export function addTimeDifference(
  startTimeOriginal: string,
  endTimerOriginal: string,
  cellTime: string
) {
  // Define a reference date (any arbitrary date will work)

  const startTimeOriginalISO = parseISO(startTimeOriginal);
  const endTimerORiginalISO = parseISO(endTimerOriginal);
  const cellTimeISO = parseISO(cellTime);
  // Parse the time strings

  // Calculate the difference in minutes between the first two times

  const difference = differenceInMinutes(
    startTimeOriginalISO,
    endTimerORiginalISO
  );

  // Add the difference to the start of the second time
  const newTimeEnd = addMinutes(cellTimeISO, difference);

  // Format the new time back to "HH:mm:ss"
  const formattedNewTimeStart = format(cellTimeISO, "HH:mm:ss");
  const formattedNewTimeEnd = format(newTimeEnd, "HH:mm:ss");

  return { startDate: formattedNewTimeEnd, endDate: formattedNewTimeStart };
}

// To Parse a basic date such as 18:00:00
export function parseBasicTime(hourStr: string): string {
  //   const parsedDate = parse(
  //     `${referenceDate}T${hourStr}`,
  //     "yyyy-MM-dd'T'HH:mm:ss",
  //     new Date()
  //   );

  return `2024-04-21T${hourStr}.000Z`;
}

// The main problem is is that transoformDateToInset uses Javasript for Date(),
// meaning that it will not allow the user to move it past 2 or else it will change the day
// and it will not be able to move it past 24:00
// This is a problem, I need to be able to have 2 functions : One that will retrive the days from the UTC+0 and display them as UTC+2
//And one to create days with the standard 24 hours but with the timezone of the user

// FIXED WITH UTCDATE

// REFACTOR THIS FUNCTION TO ONLY BE CALLED ONCE AND NOT 500 TIMES
export function transformStringtoInset(
  dateStart: Date | string,
  dateEnd: Date | string
): Insets {
  const startDate = dateStart;
  const endDate = dateEnd;

  // Calculate the minutes from the start of the day for both start and end dates
  const startOfDayDate = startOfDay(startDate);
  const startMinutes = differenceInMinutes(startDate, startOfDayDate);
  const endMinutes = differenceInMinutes(endDate, startOfDayDate);

  const totalMinutesInDay = 24 * 60; // Define total minutes in a day

  // Calculate the top and bottom percentages
  const topPercentage = (startMinutes / totalMinutesInDay) * 100;
  let bottomPercentage = (endMinutes / totalMinutesInDay) * 100;

  if (topPercentage === bottomPercentage) {
    bottomPercentage += 1;
  }

  return {
    top: `${topPercentage}%`,
    right: "0",
    left: "0",
    bottom: `${100 - bottomPercentage}%`,
  };
}

function isConflict(
  event1: EventsResponseWithParentEventsDate,
  event2: EventsResponseWithParentEventsDate
): boolean {
  const start1 = parseISO(event1.dateStart);
  const end1 = parseISO(event1.dateEnd);
  const start2 = parseISO(event2.dateStart);
  const end2 = parseISO(event2.dateEnd);

  return isBefore(start1, end2) && isBefore(start2, end1);
}

// Intermediate type used only inside sanitizeConflictsEventOfSameDay.
interface EventWithLayout extends EventsResponseWithParentEventsDate {
  conflicts: number;
  conflictIndices: number[];
  leftPercentage: number;
  rightPercentage: number;
  startTime: number;
  endTime: number;
  index: number;
  columnIndex: number;
}

export function sanitizeConflictsEventOfSameDay(
  events: EventsResponseWithParentEventsDate[]
): EventsWithParentsConflicts[] {
  // Initialize events with necessary properties
  const updatedEvents: EventWithLayout[] = events.map((event) => ({
    ...event,
    conflicts: 0,
    conflictIndices: [],
    leftPercentage: 0,
    rightPercentage: 0,
    startTime: new Date(event.dateStart).getTime(),
    endTime: new Date(event.dateEnd).getTime(),
    index: 0,
    columnIndex: 0,
  }));

  // Sort updatedEvents by startTime to ensure consistent order
  updatedEvents.sort((a, b) => a.startTime - b.startTime);

  // Add index property based on sorted order
  updatedEvents.forEach((event, index) => {
    event.index = index;
  });

  // Build the conflict graph using indices instead of IDs
  const conflictGraph: Record<number, Set<number>> = {};

  for (let i = 0; i < updatedEvents.length; i++) {
    const event1 = updatedEvents[i];
    conflictGraph[event1.index] = conflictGraph[event1.index] || new Set();

    for (let j = i + 1; j < updatedEvents.length; j++) {
      const event2 = updatedEvents[j];

      if (isConflict(event1, event2)) {
        // Update conflicts
        event1.conflicts++;
        event1.conflictIndices.push(event2.index);

        event2.conflicts++;
        event2.conflictIndices.push(event1.index);

        // Build conflict graph
        conflictGraph[event1.index].add(event2.index);
        conflictGraph[event2.index] = conflictGraph[event2.index] || new Set();
        conflictGraph[event2.index].add(event1.index);
      }
    }
  }

  // Find conflict groups (connected components in the conflict graph)
  const conflictGroups: EventWithLayout[][] = [];
  const visitedIndices = new Set<number>();

  for (const event of updatedEvents) {
    if (!visitedIndices.has(event.index)) {
      const group = [];
      const stack = [event.index];
      visitedIndices.add(event.index);

      while (stack.length > 0) {
        const currentIndex = stack.pop();
        if (currentIndex === undefined) continue;
        const currentEvent = updatedEvents[currentIndex];
        group.push(currentEvent);
        const neighbors = conflictGraph[currentIndex] || new Set();

        for (const neighborIndex of neighbors) {
          if (!visitedIndices.has(neighborIndex)) {
            visitedIndices.add(neighborIndex);
            stack.push(neighborIndex);
          }
        }
      }

      conflictGroups.push(group);
    }
  }

  // Assign columns within each conflict group using the same logic
  for (const group of conflictGroups) {
    // The group is already sorted by startTime
    const columns: EventWithLayout[][] = [];

    for (const event of group) {
      let assigned = false;

      // Try to assign the event to the earliest available column
      for (let colIndex = 0; colIndex < columns.length; colIndex++) {
        const column = columns[colIndex];
        let conflictInColumn = false;

        // Check for conflicts with events already in the column
        for (const colEvent of column) {
          if (isConflict(event, colEvent)) {
            conflictInColumn = true;
            break;
          }
        }

        if (!conflictInColumn) {
          // Assign event to this column
          column.push(event);
          event.columnIndex = colIndex;
          assigned = true;
          break;
        }
      }

      // If no suitable column found, create a new one
      if (!assigned) {
        event.columnIndex = columns.length;
        columns.push([event]);
      }
    }

    const totalColumns = columns.length;

    // Calculate leftPercentage and rightPercentage based on column assignment
    for (const event of group) {
      event.leftPercentage = (event.columnIndex / totalColumns) * 100;
      event.rightPercentage =
        ((totalColumns - event.columnIndex - 1) / totalColumns) * 100;
    }
  }

  // Clean up temporary properties before returning
  return updatedEvents.map(
    ({ startTime: _s, endTime: _e, index: _i, columnIndex: _c, conflictIndices: _ci, ...rest }) =>
      rest as EventsWithParentsConflicts
  );
}

export function transformUTCDateToInset(dateStart: UTCDate, dateEnd: UTCDate) {
  const startOfDayDate = startOfDay(dateStart);

  const startMinutes = differenceInMinutes(dateStart, startOfDayDate);
  const endMinutes = differenceInMinutes(dateEnd, startOfDayDate);

  const totalMinutesInDay = 24 * 60; // Define total minutes in a day

  // Calculate the top and bottom percentages
  const topPercentage = (startMinutes / totalMinutesInDay) * 100;
  const bottomPercentage = (endMinutes / totalMinutesInDay) * 100;

  return {
    top: `${topPercentage}%`,
    right: 0,
    left: 0,
    bottom: `${100 - bottomPercentage}%`,
  };
}

export function calculateEventPosition(
  totalColumns: number,
  idxColumn: number
) {
  const leftPercentage = (idxColumn * 100) / totalColumns;
  const rightPercentage = 100 - ((idxColumn + 1) * 100) / totalColumns;

  return {
    left: `${leftPercentage}%`,
    right: `${rightPercentage}%`,
  };
}

export function calculateEventPositionWithBrothers(
  totalColumns: number,
  idxColumn: number,
  brothers: EventsResponseWithParentEventsDate[]
) {
  const leftPercentage = (idxColumn * 100) / totalColumns;
  const rightPercentage = 100 - ((idxColumn + 1) * 100) / totalColumns;

  return {
    left: `${leftPercentage}%`,
    right: `${rightPercentage}%`,
  };
}

export function retrieveEventPositionBasedOnTotalColumns(
  left: string,
  right: string,
  totalColumns: 1 | 5 | 7
) {
  const leftPercentage = parseFloat(left);
  const rightPercentage = parseFloat(right);

  const position = (leftPercentage + (100 - rightPercentage)) / 2;

  return Math.floor((position / 100) * totalColumns);
}

export function calculateEventOffsetX(
  totalColumns: number,
  idxColumn: number,
  basedEventColumn: number
) {
  return basedEventColumn - idxColumn;
}

export function checkHowManyDays(event: EventsResponse) {
  if (!isSameDay(new Date(event.dateStart), new Date(event.dateEnd))) {
    const numberOfDays = differenceInCalendarDays(
      new Date(event.dateEnd),
      new Date(event.dateStart)
    );
    for (let i = 0; i <= numberOfDays; i++) {
      const currentDate = addDays(new Date(event.dateStart), i);
      // You can add your logic here to handle each date
    }
  }
}

export function updateOneDateToProperTimeZone(
  event: EventsResponseWithParentEventsDate
): EventsResponseWithParentEventsDate[] {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const numberOfDays = differenceInCalendarDays(
    new Date(event.parentEventsDate.dateEnd),
    new Date(event.parentEventsDate.dateStart)
  );

  const transformedEvents: EventsResponseWithParentEventsDate[] = [];

  for (let i = 0; i <= numberOfDays; i++) {
    const currentDateStart =
      i === 0
        ? event.parentEventsDate.dateStart
        : addDays(startOfDay(event.parentEventsDate.dateStart), i);
    const currentDateEnd =
      i === numberOfDays
        ? event.parentEventsDate.dateEnd
        : addDays(startOfDay(event.parentEventsDate.dateStart), i + 1);

    const formatEventInTimeZonedateStart = formatInTimeZone(
      currentDateStart,
      timeZone,
      "yyyy-MM-dd'T'HH:mm:ssXXX"
    );
    const formatEventInTimeZonedateEnd = formatInTimeZone(
      currentDateEnd,
      timeZone,
      "yyyy-MM-dd'T'HH:mm:ssXXX"
    );

    // To PREVENT DateStart = Monday DateEnd Tuesday 00:00:00 to push a useless item in the array
    if (i === numberOfDays) {
      if (
        !isEqual(
          new Date(formatEventInTimeZonedateEnd),
          startOfDay(new Date(formatEventInTimeZonedateEnd))
        )
      ) {
        transformedEvents.push({
          ...event,
          dateStart: formatEventInTimeZonedateStart,
          dateEnd: formatEventInTimeZonedateEnd,
        });
      }
    } else {
      transformedEvents.push({
        ...event,
        dateStart: formatEventInTimeZonedateStart,
        dateEnd: formatEventInTimeZonedateEnd,
      });
    }
  }

  return transformedEvents;
}

export function transformDatestoProperTimeZone(
  events: (EventsResponse | EventsResponseWithParentEventsDate)[]
): EventsResponseWithParentEventsDate[] {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return events.flatMap((event) => {
    const numberOfDays = differenceInCalendarDays(
      new Date(event.dateEnd),
      new Date(event.dateStart)
    );

    const transformedEvents: EventsResponseWithParentEventsDate[] = [];
    for (let i = 0; i <= numberOfDays; i++) {
      const currentDateStart =
        i === 0
          ? new Date(event.dateStart)
          : addDays(startOfDay(new Date(event.dateStart)), i);
      const currentDateEnd =
        i === numberOfDays
          ? new Date(event.dateEnd)
          : addDays(startOfDay(new Date(event.dateStart)), i + 1);

      const formatEventInTimeZonedateStart = formatInTimeZone(
        currentDateStart,
        timeZone,
        "yyyy-MM-dd HH:mm:ssXXX"
      );
      const formatEventInTimeZonedateEnd = formatInTimeZone(
        currentDateEnd,
        timeZone,
        "yyyy-MM-dd HH:mm:ssXXX"
      );

      // To PREVENT DateStart = Monday DateEnd Tuesday 00:00:00 to push a useless item in the array

      if (i === numberOfDays) {
        if (
          isEqual(
            formatEventInTimeZonedateEnd,
            startOfDay(formatEventInTimeZonedateEnd)
          )
        ) {
        } else
          transformedEvents.push({
            ...event,
            dateStart: formatEventInTimeZonedateStart,
            dateEnd: formatEventInTimeZonedateEnd,
            createdAt: event.createdAt,
            updatedAt: event.updatedAt,
            parentEventsDate: event,
            user: (event as EventsResponseWithParentEventsDate).user,
          });
      } else
        transformedEvents.push({
          ...event,
          dateStart: formatEventInTimeZonedateStart,
          dateEnd: formatEventInTimeZonedateEnd,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
          parentEventsDate: event,
          user: (event as EventsResponseWithParentEventsDate).user,
        });
    }
    return transformedEvents;
  });
}

export function transformDatestoProperTimeZonePreview(
  dateStart: Date | UTCDate | "",
  dateEnd: Date | UTCDate | ""
): {
  dateStart: string;
  dateEnd: string;
}[] {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const numberOfDays = differenceInCalendarDays(
    new Date(dateEnd),
    new Date(dateStart)
  );

  const transformedEvents: Array<{ dateStart: string; dateEnd: string; timeZone: string; parentEventsDate: { dateStart: string; dateEnd: string } }> = [];
  for (let i = 0; i <= numberOfDays; i++) {
    const currentDateStart =
      i === 0
        ? new Date(dateStart)
        : addDays(startOfDay(new Date(dateStart)), i);
    const currentDateEnd =
      i === numberOfDays
        ? new Date(dateEnd)
        : addDays(startOfDay(new Date(dateStart)), i + 1);

    const formatEventInTimeZonedateStart = formatInTimeZone(
      currentDateStart,
      timeZone,
      "yyyy-MM-dd HH:mm:ssXXX"
    );
    const formatEventInTimeZonedateEnd = formatInTimeZone(
      currentDateEnd,
      timeZone,
      "yyyy-MM-dd HH:mm:ssXXX"
    );

    if (i === numberOfDays) {
      if (
        isEqual(
          formatEventInTimeZonedateEnd,
          startOfDay(formatEventInTimeZonedateEnd)
        )
      )
        continue;
    }

    transformedEvents.push({
      dateStart: formatEventInTimeZonedateStart,
      dateEnd: formatEventInTimeZonedateEnd,
      timeZone,
      parentEventsDate: {
        dateStart: currentDateStart.toISOString(),
        dateEnd: currentDateEnd.toISOString(),
      },
    });
  }
  return transformedEvents;
}

export function replaceDate(originalDateTime: string, newDate: string) {
  // Extract the year, month, and day from the new date string
  const [newYear, newMonth, newDay] = newDate.split("-");

  // Use a regular expression to replace the year, month, and day in the original datetime string
  const updatedDateTime = originalDateTime.replace(
    /\d{4}-\d{2}-\d{2}/,
    `${newYear}-${newMonth}-${newDay}`
  );

  return updatedDateTime;
}

export function calculateOffset(
  dateStart: string,
  datePicked: string,
  dateEnd: string
) {
  const timezoneOffsetRegex = /[+-]\d{2}:\d{2}$/;
  const endDateZ = dateEnd.replace(timezoneOffsetRegex, "Z");
  const startDateZ = dateStart.replace(timezoneOffsetRegex, "Z");

  const difference = differenceInMinutes(startDateZ, datePicked);
  const difference2 = differenceInMinutes(endDateZ, datePicked);

  return { offSetTop: difference, offSetBottom: difference2 };
}

export function getAllEventIds(
  allEvents: EventsResponse[],
  id: number
): EventsResponse[] {
  return allEvents.filter((event) => event.id === id);
}

export function concateDateWithString(
  dateObj: Date | string | UTCDate,
  dateString: string
) {
  const parsedDate = parseISO(dateString); // Parse the date string
  const updatedDate = setYear(dateObj, parsedDate.getFullYear());
  const updatedDateWithMonth = setMonth(updatedDate, parsedDate.getMonth());
  const finalUpdatedDate = setDate(updatedDateWithMonth, parsedDate.getDate());

  return finalUpdatedDate;
}

export function getCurrentTimePercentage() {
  const now = new Date();
  const startOfDayTime = startOfDay(now);
  const totalMinutesInDay = 1440; // 24 * 60

  const currentMinutes = differenceInMinutes(now, startOfDayTime);
  const currentTop = (currentMinutes / totalMinutesInDay) * 100;

  return `${currentTop}%`;
}

export const retrieveRoomName = (rooms: Room[], subTagId: number): string => {
  const roomFind = rooms.find((item) => item.id === subTagId);
  return roomFind ? roomFind.name : "";
};
