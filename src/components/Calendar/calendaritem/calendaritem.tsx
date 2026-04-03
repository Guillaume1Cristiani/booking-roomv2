"use client";

import { useCalendarStore } from "@/app/calendar/providers/calendar-store-provider";
import { FormValues } from "@/app/data/events";
import { updateEvent } from "@/app/utils/queries";
import { EventForm } from "@/components/Calendar/calendaritem/EventForm";
import {
  EventsResponseWithParentEventsDate,
  PreviewInsets,
} from "@/components/Calendar/types/types";
import { roomBackgroundFinder } from "@/lib/roomFinder";
import {
  calculateEventOffsetX,
  calculateEventPosition,
  getAllEventIds,
  retrieveRoomName,
  transformStringtoInset,
  updateOneDateToProperTimeZone,
} from "@/lib/time";
import { useDomRef } from "@/lib/useDomRef";
import * as Popover from "@radix-ui/react-popover";
import { formatISO } from "date-fns";
import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import { useShallow } from "zustand/react/shallow";
import "./styles.css";

function CalendarItem({
  eventInfos,
  idxColumn,
  conflictInsetsX,
  isEditable,
}: {
  eventInfos: EventsResponseWithParentEventsDate;
  idxColumn: { total: number; index: number; currentDate: string };
  conflictInsetsX: { right: string; left: string };
  isEditable: boolean;
}) {
  const boundariesRef = useDomRef("calendar");
  const [hover, setHover] = useState(false);
  const [isModalOpen, setisModalOpen] = useState<boolean>(
    eventInfos.id === -42
  );
  const state = useCalendarStore((state) => state);
  const updateisResize = useCalendarStore((state) => state.isResize);
  const updateOnStartDrag = useCalendarStore(
    useShallow((state) => state.updateOnStartDrag)
  );

  const { top, bottom } = useMemo(
    () => transformStringtoInset(eventInfos.dateStart, eventInfos.dateEnd),
    [eventInfos.dateStart, eventInfos.dateEnd]
  );

  function onDragParentStart(
    e: React.DragEvent<HTMLDivElement>,
    resize: false | "up" | "down" = false
  ) {
    e.stopPropagation();
    // childRef.current?.classList.add("opacity-20");
    const documentEventsId = document.querySelectorAll(
      `[data-id="${String(eventInfos.id)}"]`
    );
    documentEventsId.forEach((element) => {
      element.classList.add("opacity-20");
    });
    const allEventsBasedId = getAllEventIds(
      state.transformedAllEvents,
      eventInfos.id
    );

    let img = document.createElement("img");
    img.src =
      "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
    e.dataTransfer?.setDragImage(img, 0, 0);

    // What if documentsEventId and getAllEventsBasedId are not the same length !!! Need to fix that
    const previewStyleInsets: PreviewInsets[] = allEventsBasedId.map(
      (element, index) => {
        const { top, bottom } = transformStringtoInset(
          element.dateStart,
          element.dateEnd
        );
        const { left, right } = calculateEventPosition(
          idxColumn.total,
          Number(documentEventsId[index]?.getAttribute("data-column")) || 0
        );
        return {
          offsets: {
            offSetBottom: 0,
            offSetTop: 0,
            offsetX: calculateEventOffsetX(
              idxColumn.total,
              idxColumn.index,
              Number(documentEventsId[index]?.getAttribute("data-column")) || 0
            ),
          },
          insets: {
            top,
            bottom,
            left,
            right,
          },
        };
      }
    );
    /*
      Workaround to trigger onDragStart without Rerender
    */
    setTimeout(() => {
      updateOnStartDrag(eventInfos, previewStyleInsets, true, {
        dateStart: new Date(eventInfos.parentEventsDate.dateStart),
        dateEnd: new Date(eventInfos.parentEventsDate.dateEnd),
        color: roomBackgroundFinder(state.rooms, Number(eventInfos.subTag_id)),
      });
      state.updateisResize(resize);
      // For resize, seed dragging.currentDate so HoursBarDynamic's replaceDate()
      // has the correct date when assembling the new datetime from the hovered segment.
      if (resize !== false) {
        state.setDragging(idxColumn);
      }
    }, 0);
  }

  async function onDragParentEnd(e: React.DragEvent<HTMLDivElement>) {
    // childRef.current?.classList.remove("opacity-20");
    e.preventDefault();
    document
      .querySelectorAll(`[data-id="${String(eventInfos.id)}"]`)
      .forEach((element) => {
        element.classList.remove("opacity-20");
      });

    state.setDragging({ total: 5, index: -1, currentDate: "" });
    state.updateOnDragChildStart("", {
      dateStart: "",
      dateEnd: "",
    });
    state.updatePreviewInfos({
      dateStart: "",
      dateEnd: "",
      color: roomBackgroundFinder(
        state.rooms,
        Number(state.eventInfos.subTag_id)
      ),
    });
    state.updateOffsetPreview({ offSetBottom: 0, offSetTop: 0 });
    const formValues: FormValues = {
      id: state.eventInfos.id,
      name: state.eventInfos.name,
      description: state.eventInfos.description,
      dateStart: state.previewInfos.dateStart as string,
      dateEnd: state.previewInfos.dateEnd as string,
      subTag_id: state.eventInfos.subTag_id,
      microsoft_id: state.eventInfos.microsoft_id,
    };
    if (state.previewInfos.dateStart !== "" || state.previewInfos.dateEnd) {
      const newParent = {
        name: state.eventInfos.name,
        description: state.eventInfos.description,
        id: state.eventInfos.id,
        subTag_id: Number(state.eventInfos.subTag_id),
        dateStart: formatISO(state.previewInfos.dateStart),
        dateEnd: formatISO(state.previewInfos.dateEnd),
        microsoft_id: state.eventInfos.microsoft_id,
        createdAt: eventInfos.createdAt,
        updatedAt: new Date().toISOString(),
      };
      const updateStateValues: EventsResponseWithParentEventsDate = {
        ...formValues,
        id: state.eventInfos.id,
        subTag_id: Number(state.eventInfos.subTag_id),
        dateStart: formatISO(state.previewInfos.dateStart),
        dateEnd: formatISO(state.previewInfos.dateEnd),
        parentEventsDate: newParent,
        user: eventInfos.user,
        createdAt: eventInfos.createdAt,
        updatedAt: new Date().toISOString(),
      };
      const previousEventInfos = updateOneDateToProperTimeZone(eventInfos);
      const test = updateOneDateToProperTimeZone(updateStateValues);
      state.updateTransformedOneEvent(test);
      try {
        const test30 = await updateEvent(formValues, true);
        if (test30?.status === 403 && toast?.error) {
          toast.error(test30?.error);
          state.updateTransformedOneEvent(previousEventInfos);
        }
        // if (test30.status === 403) toast.error(test30.body);
      } catch (e) {
        toast.error("Unauthorized");
        state.updateTransformedOneEvent(previousEventInfos);
      }
    }
  }

  const onOpenChange = (open: boolean) => {
    if (open === false && eventInfos.id === -42) {
      const allEventsWithoutUnfinished = state.transformedAllEvents.filter(
        (allEvents) => allEvents.id !== -42
      );
      state.updateTransformedAllEvents(allEventsWithoutUnfinished);
    }
  };

  function closeModal() {
    setisModalOpen(false);
  }

  const roomColor =
    eventInfos.id === -42
      ? "#d6d3d1" // stone-300
      : roomBackgroundFinder(state.rooms, Number(eventInfos.subTag_id));

  const itemClassname = `rounded-md ${
    isModalOpen && eventInfos.id !== -42
      ? " shadow-[inset_0_0_0_2px_rgba(0,0,0,1)]"
      : ""
  }`;

  const roomName = retrieveRoomName(
    state.rooms,
    eventInfos.subTag_id as number
  );

  return (
    <Popover.Root onOpenChange={onOpenChange} open={isModalOpen}>
      <div
        draggable={eventInfos.id !== -42}
        onDragEnd={isEditable ? onDragParentEnd : (e) => e.preventDefault()}
        onDragStart={isEditable ? onDragParentStart : (e) => e.preventDefault()}
        onDragOver={(e) => e.preventDefault()}
        onMouseDown={(e) => e.stopPropagation()} // To Override if you try to create
        onMouseOver={(e) => e.stopPropagation()} // To Override if you try to create
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <Popover.Trigger asChild onClick={() => setisModalOpen(true)}>
          <div
            data-id={String(eventInfos.id)}
            data-column={idxColumn.index}
            className={itemClassname}
            style={{
              top: top,
              bottom: bottom,
              left: conflictInsetsX.left,
              right: conflictInsetsX.right,
              position: "absolute",
              cursor: "pointer",
              display: "flex",
              backgroundColor: roomColor + "99", // ~60% opacity for the box
            }}
          >
            <div
              className="h-full min-w-1 rounded-bl-md rounded-tl-md"
              style={{ backgroundColor: eventInfos.id === -42 ? "#78716c" : roomColor }}
            />

            {top !== "0%" && eventInfos.id !== -42 && isEditable && (
              <div
                draggable={true}
                onDragStart={(e) => {
                  e.stopPropagation();
                  state.updateIsNewPreviewDisplay(false);
                  onDragParentStart(e, "up");
                }}
                className={`${
                  hover ? "block" : "hidden"
                }    bg-gray-100 border-2 border-black rounded-full h-4 w-4 absolute top-[-0.25rem] cursor-n-resize`}
                style={{ left: "calc(50% - 0.5rem + 2px)" }}
              ></div>
            )}
            <p className="p-t-2 px-1 overflow-hidden text-zinc-900 w-full text-wrap whitespace-nowrap select-none">
              {roomName} {eventInfos.name}
            </p>
            {bottom !== "0%" && eventInfos.id !== -42 && isEditable && (
              <div
                draggable={true}
                onDragStart={(e) => {
                  e.stopPropagation();
                  state.updateIsNewPreviewDisplay(false);
                  onDragParentStart(e, "down");
                }}
                className={`${
                  hover ? "block" : "hidden"
                }   bg-gray-100 border-2 border-black rounded-full h-4 w-4 absolute bottom-[-0.25rem] cursor-s-resize`}
                style={{ left: "calc(50% - 0.5rem + 2px)" }}
              ></div>
            )}
          </div>
        </Popover.Trigger>
      </div>
      <Popover.Portal>
        <Popover.Content
          align="center"
          arrowPadding={6}
          collisionBoundary={boundariesRef.current}
          asChild
          className="drop-shadow-lg rounded bg-white text-zinc-900 PopoverContent"
          avoidCollisions={true}
          side={"left"}
          sideOffset={5}
          aria-disabled={"true"}
          onEscapeKeyDown={closeModal}
          onPointerDownOutside={closeModal}
          onFocusOutside={closeModal}
          onInteractOutside={closeModal}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div>
            <EventForm
              setisModalOpen={setisModalOpen}
              eventInfos={eventInfos}
              isEditable={isEditable}
            />
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export default CalendarItem;
