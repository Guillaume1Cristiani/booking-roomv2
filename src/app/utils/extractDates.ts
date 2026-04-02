/*
  Goal of this file is to Extract the Events and to transform them into Overlay
*/

import {
  differenceInMilliseconds,
  millisecondsToMinutes,
  parseISO,
  setHours,
  setMinutes,
  startOfDay,
} from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { Events, OverlaysEvent } from "../data/events";

export function formattedDateFR(dateIso: string): Date {
  const transformDate = formatInTimeZone(
    dateIso,
    "Europe/Paris",
    "yyyy-MM-dd HH:mm:ss"
  );
  const parseIsoDate = parseISO(transformDate);
  return parseIsoDate;
}

export function retrieveSpecificDate(date: any) {
  return formattedDateFR(date);
}

export function setTimeFromDateIndex(date: Date, timeIndex: number): Date {
  const hours = Math.floor(timeIndex / 2);
  const minutes = (timeIndex % 2) * 30;
  return setMinutes(setHours(date, hours), minutes);
}

export function retrievePosition(
  dateIso: string,
  endOrStart: "start" | "end" = "start"
): number {
  const parseIsoDate = formattedDateFR(dateIso);
  const startOfToday = startOfDay(parseIsoDate);
  const millisecondsSinceStartOfDay = differenceInMilliseconds(
    parseIsoDate,
    startOfToday
  );
  const minutes = millisecondsToMinutes(millisecondsSinceStartOfDay);

  let position = minutes / 30;
  switch (endOrStart) {
    case "end": {
      if ((minutes % 60 === 0 || minutes % 60 === 30) && position > 0) {
        position -= 1;
      }
    }
    case "start": {
    }
    // if it's exactly 30
  }
  return position;
}

export function extractDates(events: Events): OverlaysEvent {
  const startElement = retrievePosition(events.dateStart);
  const endElement = retrievePosition(events.dateEnd, "end");

  return {
    infos: events,
    startElement,
    endElement,
    style: {
      top: "72px",
      height: "264px",
      position: "absolute",
      zIndex: "10",
      backgroundColor: "tomato",
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
    },
    defaultOpen: false,
  };
}
