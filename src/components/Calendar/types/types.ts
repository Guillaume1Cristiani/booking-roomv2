import { UTCDate } from "@date-fns/utc";

export interface Room {
  id: number;
  name: string;
  description: string;
  color: string;
  tag_id: number;
}

export type Role = "VIEWER" | "ADMIN" | "EDITOR";

type StandardHttpMethod =
  | "GET"
  | "HEAD"
  | "POST"
  | "PUT"
  | "DELETE"
  | "CONNECT"
  | "OPTIONS"
  | "TRACE"
  | "PATCH";

export type HttpMethod = StandardHttpMethod | (string & {});

export interface User {
  id: string;
  givenName: string;
  surname: string;
  email: string;
  picture: string | null;
  role: Role;
  microsoft_id: string;
  society_id: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventsResponse {
  id: number;
  name: string;
  description: string;
  dateStart: string;
  dateEnd: string;
  subTag_id: number;
  microsoft_id: string;
  createdAt: string;
  updatedAt: string;
}

export type updateTypeEmitter = "insert" | "update" | "delete" | "ping";

export interface ParentEventsDate {
  id: number;
  name: string;
  description: string;
  dateStart: string;
  dateEnd: string;
  subTag_id: number;
  microsoft_id: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventsResponseWithParentEventsDate extends EventsResponse {
  parentEventsDate: ParentEventsDate;
  user: User;
}

export interface EventsWithParentsConflicts
  extends EventsResponseWithParentEventsDate {
  conflicts: number;
  conflictIds: number[];
  leftPercentage: number;
  rightPercentage: number;
}

export interface Insets {
  top: string;
  bottom: string;
  left: string;
  right: string;
}

export interface OffSets {
  offSetBottom: number;
  offSetTop: number;
}

export interface PreviewInsets {
  insets: Insets;
  offsets: OffSets;
}

export interface ItemPreview {
  isResize: "up" | "down" | false;
  eventsBrut: EventsResponse[];
  transformedAllEvents: EventsResponseWithParentEventsDate[];
  dates: string[];
  calendarMonthDisplay: Date;
  eventInfos: EventsResponseWithParentEventsDate;
  isPreviewDisplay: boolean;
  isNewPreviewDisplay: boolean;
  dragging: { total: number; index: number; currentDate: string };
  onDragChildStart: {
    cellStart: string;
    brutEvents: { dateStart: string; dateEnd: string };
  };
  offset: number;
  previewInfos: {
    color: string;
    dateStart: Date | UTCDate | "";
    dateEnd: Date | UTCDate | "";
  };
  createPreviewInfos: {
    dates: {
      dateStart: Date | UTCDate | "";
      dateEnd: Date | UTCDate | "";
    };
    origin: Date | UTCDate | "";
  };
  previewStyle: PreviewInsets[];
  rooms: Room[];
  unwantedRooms: Set<Number>;
  user: User;
  viewMode: "day" | "week";
  activeDayIndex: number;
}

export type CalendarActions = {
  updatePreviewInfos: (previewInfos: ItemPreview["previewInfos"]) => void;
  updateDatesWithStart: (newStartDate: Date) => void;
  updateCalendarMonthDisplayDate: (newCalendarMonthDisplayDate: Date) => void;
  resetToToday: () => void;
  updateCreatePreviewInfos: (
    previewInfos: ItemPreview["createPreviewInfos"]
  ) => void;
  updateEventInfos: (eventInfos: ItemPreview["eventInfos"]) => void;
  // updateInsetY: (inset: { top: string; bottom: string }) => void;
  // updateInsetX: (inset: { right: string; left: string }) => void;
  updateOnDragChildStart: (
    newChildDateStart: string,
    brutEvents: { dateStart: string; dateEnd: string }
  ) => void;
  updateOffsetY: (newOffset: number) => void;
  updateOffsetPreview: (offsets: {
    offSetBottom: number;
    offSetTop: number;
  }) => void;
  updateInsetPreview: (
    inset:
      | Insets
      | {
          top: string;
          bottom: string;
        }
      | { left: string; right: string }
  ) => void;
  updateisResize: (newisResize: "up" | "down" | false) => void;
  updateOnStartDrag: (
    newEventInfos: ItemPreview["eventInfos"],
    newPreviewStyle: ItemPreview["previewStyle"],
    isPreviewDisplay: ItemPreview["isPreviewDisplay"],
    newPreviewInfos: ItemPreview["previewInfos"]
  ) => void;
  updateIsPreviewDisplay: (isDisplay: ItemPreview["isPreviewDisplay"]) => void;
  updateIsNewPreviewDisplay: (
    isDisplay: ItemPreview["isPreviewDisplay"]
  ) => void;

  setDragging: (isDisplay: ItemPreview["dragging"]) => void;
  updateTransformedAllEvents: (
    allEvents: ItemPreview["transformedAllEvents"]
  ) => void;
  updateSSEdata: (
    event: EventsResponse | { id: number },
    action: updateTypeEmitter
  ) => void;
  addTransformedAllEvents: (
    newEvent: EventsResponseWithParentEventsDate | EventsResponseWithParentEventsDate[]
  ) => void;
  updateTransformedOneEvent: (
    newEvent: EventsResponseWithParentEventsDate[] // One Event can Have Multiple child
  ) => void;
  updateUnwantedRoom: (newUnwantedRooms: Room | Room[] | "reset") => void;
  updateViewMode: (mode: "day" | "week") => void;
  navigateDayMode: (direction: -1 | 1) => void;
};

export type CalendarStore = ItemPreview & CalendarActions;
