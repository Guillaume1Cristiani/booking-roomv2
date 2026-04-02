"use server";

import { FormValues } from "@/app/data/events";
import { formatISO } from "date-fns";
import { apiHandler } from "./apiHandler";

export async function getAllEvents() {
  const res = await apiHandler("/events", {
    next: { tags: ["events"] },
  });
  return res;
}

export async function createEvent(data: FormValues) {
  // CLEAN UP THE DATA
  data.microsoft_id = "";
  data.dateEnd = formatISO(data.dateEnd);
  data.dateStart = formatISO(data.dateStart);
  data.subTag_id = Number(data.subTag_id);

  const res = await apiHandler(
    "/events",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
    "events"
  );
  return res;
}

export async function updateEvent(
  data: Omit<FormValues, "microsoft_id">,
  revalidateEvents: boolean = true
) {
  data.dateEnd = formatISO(data.dateEnd);
  data.dateStart = formatISO(data.dateStart);
  data.subTag_id = Number(data.subTag_id);
  const res = await apiHandler(
    "/events",
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
    revalidateEvents ? "events" : ""
  );
  return res;
}

export async function deleteEvent(data: Omit<FormValues, "id">) {
  const res = await apiHandler(
    "/events",
    {
      method: "DELETE",
      body: JSON.stringify(data),
    },
    "events"
  );
  return res;
}

export async function getAllRooms() {
  const res = await apiHandler("/rooms");
  return res;
}

// Conflict Rooms if it's already been created
export async function getConflictsRooms(
  id: Number,
  dateStart: string,
  dateEnd: string
) {
  const searchParams = new URLSearchParams();
  searchParams.append("dStart", dateStart);
  searchParams.append("dEnd", dateEnd);
  searchParams.append("id", id.toString());

  const res = await apiHandler(`/events/conflicts?${searchParams.toString()}`);
  return res;
}
