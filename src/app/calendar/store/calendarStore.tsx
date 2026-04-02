// @ts-nocheck
import {
  CalendarStore,
  EventsResponse,
  EventsResponseWithParentEventsDate,
  Insets,
  ItemPreview,
  ParentEventsDate,
  PreviewInsets,
  Room,
  updateTypeEmitter,
} from "@/components/Calendar/types/types";
import {
  calculateEventPosition,
  retrieveEventPositionBasedOnTotalColumns,
  transformDatestoProperTimeZone,
} from "@/lib/time";
import { UTCDate } from "@date-fns/utc";
import { addDays, format, startOfWeek } from "date-fns";
import { createStore } from "zustand";
import { mockupEvents } from "../data/mockup";

const defaultState: ItemPreview = {
  eventsBrut: mockupEvents,
  dates: Array.from({ length: 5 }, (_, i) =>
    format(
      addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i),
      "yyyy-MM-dd"
    )
  ),
  calendarMonthDisplay: new Date(),
  eventInfos: {
    id: 0,
    name: "",
    description: "",
    dateStart: "",
    dateEnd: "",
    subTag_id: 0,
    microsoft_id: "",
    createdAt: "",
    updatedAt: "",
    parentEventsDate: {
      id: 0,
      name: "",
      description: "",
      dateStart: "",
      dateEnd: "",
      subTag_id: 0,
      microsoft_id: "",
      createdAt: "",
      updatedAt: "",
    },
    user: {
      id: 0,
      givenName: "",
      surname: "",
      email: "",
      picture: null,
      role: "",
      society_id: 0,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    },
  },
  offset: 0,
  // NEED TO CHANGE TOTAL VALUE DYNAMICALLY BASED ON HOW MANY DAYS THERE ARE
  dragging: { total: 5, index: -1, currentDate: "" },
  transformedAllEvents: [],
  previewStyle: [
    {
      insets: { left: "0", top: "0", right: "0", bottom: "0" },
      offsets: {
        offSetBottom: 0,
        offSetTop: 0,
      },
    },
  ],
  onDragChildStart: {
    cellStart: "",
    brutEvents: { dateStart: "", dateEnd: "" },
  },
  isPreviewDisplay: false,
  isNewPreviewDisplay: false,
  isResize: false,
  previewInfos: { dateStart: "", dateEnd: "", color: "bg-blue" },
  createPreviewInfos: { dates: { dateStart: "", dateEnd: "" }, origin: "" },
  rooms: [],
  unwantedRooms: new Set(),
  user: {
    id: 0,
    givenName: "",
    surname: "",
    microsoft_id: "",
    email: "",
    picture: null,
    role: "VIEWER",
    society_id: 0,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
};

export const createCalendarStore = (initState?: Partial<ItemPreview>) => {
  const defaultCalendarStoreValues: ItemPreview = defaultState;
  return createStore<CalendarStore>()((set) => ({
    ...defaultCalendarStoreValues,
    ...initState,
    setDragging: (newDragging: {
      total: number;
      index: number;
      currentDate: string;
    }) => set(() => ({ dragging: newDragging })),
    updateDatesWithStart: (newStartDate) => {
      const newDates = Array.from({ length: 5 }, (_, i) =>
        format(
          addDays(startOfWeek(newStartDate, { weekStartsOn: 1 }), i),
          "yyyy-MM-dd"
        )
      );
      set(() => ({ dates: newDates }));
    },
    updateCalendarMonthDisplayDate: (newCalendarMonthDisplayDate: Date) => {
      set(() => ({ calendarMonthDisplay: newCalendarMonthDisplayDate }));
    },
    updateTransformedAllEvents: (
      allEvents: ItemPreview["transformedAllEvents"]
    ) => set(() => ({ transformedAllEvents: allEvents })),
    updateSSEdata: (
      newEvents: ItemPreview["transformedAllEvents"],
      action: updateTypeEmitter
    ) =>
      set((state) => {
        if (!newEvents) throw new Error("Unexpected body");
        let newTransformedAllEvents = [...state.transformedAllEvents];
        switch (action as updateTypeEmitter) {
          case "delete": {
            const idToDelete = newEvents?.id;
            if (idToDelete != undefined) {
              // Filter out all entries with the matching ID
              newTransformedAllEvents = newTransformedAllEvents.filter(
                (event) => event.id !== idToDelete
              );
            }

            return { transformedAllEvents: newTransformedAllEvents };
          }
          case "insert": {
            const transformedDates: EventsResponseWithParentEventsDate[] =
              transformDatestoProperTimeZone([newEvents]);

            const existingIds = new Set(
              newTransformedAllEvents.map((event) => event.id)
            );

            const alreadyExists = transformedDates.some((event) =>
              existingIds.has(event.id)
            );

            if (!alreadyExists) {
              newTransformedAllEvents = [
                ...newTransformedAllEvents,
                ...transformedDates,
              ];
            }

            return { transformedAllEvents: newTransformedAllEvents };
          }
          case "update": {
            const transformedDates: EventsResponseWithParentEventsDate[] =
              transformDatestoProperTimeZone([newEvents]);
            const idToDelete = transformedDates[0]?.id;

            if (idToDelete !== undefined) {
              newTransformedAllEvents = newTransformedAllEvents.filter(
                (event) => event.id !== idToDelete
              );
            } else {
              throw new Error("Invalid body in SSE");
            }

            return {
              transformedAllEvents: [
                ...newTransformedAllEvents,
                ...transformedDates,
              ],
            };
          }
          default:
            throw new Error("Unexpected type for updateTypeEmitter");
        }
      }),
    addTransformedAllEvents: (
      newEvent:
        | ItemPreview["transformedAllEvents"]
        | ItemPreview["transformedAllEvents"][]
    ) =>
      set((state) => ({
        transformedAllEvents: Array.isArray(newEvent)
          ? [...state.transformedAllEvents, ...newEvent]
          : [...state.transformedAllEvents, newEvent],
      })),
    updateTransformedOneEvent: (
      newEvent: EventsResponseWithParentEventsDate[]
    ) =>
      set((state) => {
        if (newEvent.length === 0) return state;

        const firstNewEventId = newEvent[0].id;
        const existingEventIndices = state.transformedAllEvents
          .map((event, index) => (event.id === firstNewEventId ? index : -1))
          .filter((index) => index !== -1);

        let updatedEvents = [...state.transformedAllEvents];

        // Remove existing events with the same id
        existingEventIndices.reverse().forEach((index) => {
          updatedEvents.splice(index, 1);
        });

        // Find the position to insert new events
        const insertPosition =
          existingEventIndices.length > 0
            ? Math.min(...existingEventIndices)
            : updatedEvents.length;

        // Insert new events
        updatedEvents.splice(insertPosition, 0, ...newEvent);

        return { transformedAllEvents: updatedEvents };
      }),
    updateOffsetY: (newOffset: number) => set(() => ({ offset: newOffset })),
    updatePreviewInfos: (previewInfos: ItemPreview["previewInfos"]) =>
      set(() => ({ previewInfos: previewInfos })),
    updateCreatePreviewInfos: (
      createPreviewInfos: ItemPreview["createPreviewInfos"]
    ) => set(() => ({ createPreviewInfos: createPreviewInfos })),
    // updateConfirmedCreatePreviewInfos: (
    //   createPreviw
    // )
    updateOnDragChildStart: (
      newChildDateStart: string,
      brutEvents: { dateStart: string; dateEnd: string }
    ) =>
      set(() => ({
        onDragChildStart: {
          cellStart: newChildDateStart,
          brutEvents: { dateStart: "", dateEnd: "" },
        },
      })),
    updateOffsetPreview: (offsets: {
      offSetBottom: number;
      offSetTop: number;
    }) =>
      set((state) => ({
        previewStyle: state.previewStyle.map((style) => ({
          ...style,
          offsets: { ...style.offsets, ...offsets },
        })),
      })),

    updateInsetPreview: (
      inset:
        | Insets
        | { top: string; bottom: string }
        | { left: string; right: string }
    ) =>
      set((state) => ({
        previewStyle: state.previewStyle.map((style: PreviewInsets) => {
          const isInset = "left" in inset && "right" in inset;
          return {
            ...style,
            insets: isInset
              ? {
                  ...style.insets,
                  ...calculateEventPosition(
                    state.dragging.total,
                    retrieveEventPositionBasedOnTotalColumns(
                      inset.left,
                      inset.right,
                      5
                    )
                  ),
                }
              : { ...style.insets, top: inset.top, bottom: inset.bottom },
          };
        }),
      })),
    updateisResize: (newisResize: "up" | "down" | false) =>
      set(() => ({ isResize: newisResize })),
    updateEventInfos: (
      eventInfos: EventsResponse & {
        parentEventsDate: ParentEventsDate;
      }
    ) => set(() => ({ eventInfos: eventInfos })),

    updateIsPreviewDisplay: (isDisplay: boolean) =>
      set(() => ({ isPreviewDisplay: isDisplay })),
    updateIsNewPreviewDisplay: (isNewPreview: boolean) =>
      set(() => ({ isNewPreviewDisplay: isNewPreview })),
    updateOnStartDrag: (
      newEventInfos: EventsResponseWithParentEventsDate,
      newPreviewStyle: PreviewInsets[],
      newDisplay: boolean,
      newPreviewInfos: {
        dateStart: Date | UTCDate | "";
        dateEnd: Date | UTCDate | "";
      }
    ) =>
      set(() => ({
        eventInfos: newEventInfos,
        previewStyle: newPreviewStyle,
        isPreviewDisplay: newDisplay,
        previewInfos: newPreviewInfos,
      })),
    updateUnwantedRoom: (roomInput: Room | Room[] | "reset") =>
      set((state) => {
        if (roomInput === "reset") {
          const emptyUnwantedRoom = new Set();
          return {
            unwantedRooms: emptyUnwantedRoom,
          };
        }
        if (Array.isArray(roomInput)) {
          const roomToToggle = roomInput[0]; // Assuming the room to toggle is the first in the array
          const newUnwantedRooms = new Set(state.unwantedRooms);

          if (newUnwantedRooms.has(roomToToggle.id))
            newUnwantedRooms.delete(roomToToggle.id);
          // If the room is not unwanted, add all rooms except this one
          state.rooms.forEach((room) => {
            if (room.id !== roomToToggle.id) {
              newUnwantedRooms.add(room.id);
            }
          });

          return { unwantedRooms: newUnwantedRooms };
        } else {
          // If roomInput is a single room object, toggle its presence in unwantedRooms
          const newUnwantedRooms = new Set(state.unwantedRooms);

          if (newUnwantedRooms.has(roomInput.id)) {
            // Room exists, remove it
            newUnwantedRooms.delete(roomInput.id);
          } else {
            // Room doesn't exist, add it
            newUnwantedRooms.add(roomInput.id);
          }

          return { unwantedRooms: newUnwantedRooms };
        }
      }),
  }));
};
