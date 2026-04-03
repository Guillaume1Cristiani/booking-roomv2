"use client";

import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import React, { useState } from "react";

export default function CalendarLayout({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex p-3 max-h-screen overflow-hidden">
      {/* Sidebar — hidden on mobile, visible on desktop */}
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
              className="self-end mb-2 p-1 rounded hover:bg-zinc-200"
            >
              ✕
            </button>
            {sidebar}
          </section>
        </div>
      )}

      {/* Calendar — takes remaining space */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile header bar with hamburger */}
        <div className="flex items-center lg:hidden bg-white border-b border-gray-200 p-2 gap-2">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-1 rounded hover:bg-zinc-100"
          >
            <HamburgerMenuIcon className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
