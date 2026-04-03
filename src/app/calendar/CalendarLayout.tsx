"use client";

import {
  useCalendarStore,
} from "@/app/calendar/providers/calendar-store-provider";
import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import { isSameDay, startOfWeek } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale";
import React, { useState } from "react";

export default function CalendarLayout({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const preview = useCalendarStore((s) => s);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const isCurrentWeek = isSameDay(
    new Date(preview.dates[0]),
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  return (
    <div className="flex p-3 max-h-screen overflow-hidden">
      {/* Sidebar — desktop only */}
      <section className="hidden lg:flex flex-col bg-zinc-100 overflow-hidden flex-shrink-0">
        {sidebar}
      </section>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <section className="absolute left-0 top-0 bottom-0 w-72 bg-zinc-100 flex flex-col z-50 p-3 overflow-y-auto">
            <button
              onClick={() => setDrawerOpen(false)}
              className="self-end mb-3 p-1 rounded hover:bg-zinc-200 text-zinc-500"
              aria-label="Fermer"
            >
              ✕
            </button>
            {sidebar}
          </section>
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile top bar — hidden on desktop */}
        <div className="lg:hidden flex items-center gap-2 bg-white border-b-2 border-gray-300 px-3 py-2">
          {/* Hamburger */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-1.5 rounded hover:bg-zinc-100 text-zinc-700"
            aria-label="Menu"
          >
            <HamburgerMenuIcon className="w-5 h-5" />
          </button>

          {/* Current date — day mode shows full day name, week mode shows month */}
          <span className="flex-1 text-base font-semibold text-zinc-900 capitalize truncate">
            {preview.viewMode === "day"
              ? formatInTimeZone(
                  preview.dates[preview.activeDayIndex] ?? preview.dates[0],
                  timezone,
                  "MMMM y",
                  { locale: fr }
                )
              : formatInTimeZone(preview.dates[0], timezone, "MMMM y", {
                  locale: fr,
                })}
          </span>

          {/* Aujourd'hui shortcut */}
          <button
            onClick={() => preview.resetToToday()}
            disabled={isCurrentWeek}
            className="px-3 py-1 text-xs border border-zinc-300 rounded-full font-medium hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-default"
          >
            Aujourd&apos;hui
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
