/*
 Overlays that are not properly style get styled
*/

import { RefObject } from "react";
import { EventCSSProperties, OverlaysEvent } from "../data/events";

const styleLeftAndRight = (eventsArr: OverlaysEvent[][]): OverlaysEvent[] => {
  const processedEvents: OverlaysEvent[] = eventsArr.flatMap(
    (group: OverlaysEvent[]) => {
      const sortedGroup = group.sort(
        (a: OverlaysEvent, b: OverlaysEvent) => a.startElement - b.startElement
      );
      const totalElements = sortedGroup.length;
      // Adjusting the available space to account for the 5% gap evenly on both sides
      const availableSpacePerElement = 95 / totalElements;
      const gap = (2 / (totalElements + 1)).toFixed(2); // Distribute the 5% gap evenly among elements
      return sortedGroup.map((event: OverlaysEvent, index: number) => {
        const leftPercentage = (
          (index + 1) * parseFloat(gap) +
          availableSpacePerElement * index
        ).toFixed(2);
        const rightPercentage = (
          100 -
          parseFloat(leftPercentage) -
          availableSpacePerElement
        ).toFixed(2);
        // Update the style object for each event
        return {
          ...event,
          style: {
            ...event.style,
            backgroundColor: "blue",
            left: `${leftPercentage}%`,
            right: `${rightPercentage}%`,
          },
        };
      });
    }
  );
  return processedEvents;
};

function calculateOffset(height: number, offset: number): number {
  const properDivision = offset * height;
  properDivision.toFixed(2);
  return properDivision;
}

const retrieveCalendarBorders = (
  calendarRef: RefObject<HTMLDivElement>,
  startElementidx: number,
  endElementidx: number
): {
  height: number;
  insetTop: number;
} => {
  if (calendarRef.current) {
    const slotElements = calendarRef.current.getElementsByClassName(
      "slot"
    ) as HTMLCollectionOf<HTMLElement>; // https://github.com/microsoft/TypeScript/issues/34694
    const start = {
      Element: slotElements[Math.floor(startElementidx)],
      fraction: startElementidx % 1,
      offSet: 0,
    };
    const end = {
      Element: slotElements[Math.floor(endElementidx)],
      fraction: endElementidx % 1,
      offSet: 0,
    };

    if (start.fraction != 0) {
      const height = start.Element.clientHeight;
      start.offSet = calculateOffset(height, start.fraction);
    }

    if (end.fraction != 0) {
      const height = end.Element.clientHeight;
      end.offSet = calculateOffset(height, end.fraction);
    } else end.offSet = end.Element.clientHeight;

    const height =
      end.Element.offsetTop -
      start.Element.offsetTop +
      end.offSet -
      start.offSet;
    const insetTop = start.Element.offsetTop + start.offSet;
    return { height: height, insetTop: insetTop };
  } else return { height: 0, insetTop: 0 };
};

export const styleEvent = (
  calendarRef: RefObject<HTMLDivElement>,
  startElement: number,
  endElement: number
): EventCSSProperties => {
  const { insetTop, height } = retrieveCalendarBorders(
    calendarRef,
    startElement,
    endElement
  );
  const newEventStyle: EventCSSProperties = {
    top: `${insetTop}px`,
    height: `${height}px`,
    right: `0`,
    left: "50%",
    position: "absolute",
    zIndex: "10",
    backgroundColor: "#ff0000",
    borderRadius: "2px 4px 4px 2px",
    cursor: "pointer",
    wordBreak: "break-all",
    borderLeft: "0.5rem solid orange",
    borderLeftWidth: "0.4rem",
    paddingLeft: "0.3rem",
    paddingRight: "0.1rem",
    overflow: "hidden",
    fontSize: "0.75rem",
    lineHeight: "1rem",
  };
  return newEventStyle;
};

const updateEventsStyle = (
  event: OverlaysEvent,
  calendarRef: any
): OverlaysEvent => {
  event.style = styleEvent(calendarRef, event.startElement, event.endElement);
  return event;
};

const groupEvents = (eventsArr: OverlaysEvent[]) => {
  let groupedEvents: OverlaysEvent[][] = [];
  for (const event of eventsArr) {
    let mergedGroup: OverlaysEvent[] = [];
    let nonOverlappingGroups: OverlaysEvent[][] = [];

    for (const group of groupedEvents) {
      const overlaps = group.some(
        (e) =>
          e.startElement <= event.endElement &&
          e.endElement >= event.startElement
      );
      if (overlaps) {
        mergedGroup = [...mergedGroup, ...group];
      } else {
        nonOverlappingGroups.push(group);
      }
    }

    if (!mergedGroup.find((e) => e === event)) {
      mergedGroup.push(event);
    }

    groupedEvents = [...nonOverlappingGroups, mergedGroup];
  }
  groupedEvents.map((item) => {
    return item.sort((a, b) => a.infos.id - b.infos.id);
  });
  // groupedEvents.sort((a, b) =>  )
  return groupedEvents;
};

export function initiateEvents(newEventArr: OverlaysEvent[], calendarRef: any) {
  const styledEvents = newEventArr.map((item: OverlaysEvent) => {
    return updateEventsStyle(item, calendarRef);
  });
  const groupedEvents = groupEvents(styledEvents);

  const processedEvents = styleLeftAndRight(groupedEvents);
  return processedEvents;
}

export function addAndStyleEvent(
  newEventArr: OverlaysEvent[]
): OverlaysEvent[] {
  // Step 1: Group overlapping events
  const groupedEvents = groupEvents(newEventArr);

  // Step 2: Process and style each group separately
  const processedEvents = styleLeftAndRight(groupedEvents);
  return processedEvents;
}
