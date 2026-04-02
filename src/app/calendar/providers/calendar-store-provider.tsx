"use client";

import { CalendarStore, ItemPreview } from "@/components/Calendar/types/types";
import { type ReactNode, createContext, useContext, useRef } from "react";
import { useStore } from "zustand";
import { createCalendarStore } from "../store/calendarStore";

export type CalendarApi = ReturnType<typeof createCalendarStore>;

export const CalendarStoreContext = createContext<CalendarApi | undefined>(
  undefined
);

export interface CalendarStoreProviderProps {
  initialState: Partial<ItemPreview>;
  children: ReactNode;
}

export const CalendarStoreProvider = ({
  initialState,
  children,
}: CalendarStoreProviderProps) => {
  const storeRef = useRef<CalendarApi>();
  if (!storeRef.current) {
    storeRef.current = createCalendarStore(initialState);
  }

  return (
    <CalendarStoreContext.Provider value={storeRef.current}>
      {children}
    </CalendarStoreContext.Provider>
  );
};

export const useCalendarStore = <T,>(
  selector: (store: CalendarStore) => T
): T => {
  const calendarStoreContext = useContext(CalendarStoreContext);

  if (!calendarStoreContext) {
    throw new Error(
      `useCalendarStore must be used within CalendarStoreProvider`
    );
  }

  return useStore(calendarStoreContext, selector);
};
