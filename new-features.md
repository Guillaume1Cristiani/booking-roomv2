# New Features Backlog

---

## NF-01 · "Today" button — navigate back to the current week

### Problem
Once the user navigates away from the current week, there is no quick way to return to today. The only option is to click the next/previous chevrons repeatedly.

### Proposed Solution
Add a **"Aujourd'hui"** button in the calendar header, next to the existing prev/next week chevrons. Clicking it resets `dates` and `calendarMonthDisplay` in the Zustand store to the current week.

### Implementation

**Files to modify:**
- `src/components/Calendar/main.tsx` — add button in the navigation header
- `src/app/calendar/store/calendarStore.tsx` — add `resetToToday()` action

**Store action:**
```typescript
resetToToday: () =>
  set((state) => ({
    dates: Array.from({ length: 5 }, (_, i) =>
      format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i), "yyyy-MM-dd")
    ),
    calendarMonthDisplay: new Date(),
  })),
```

**UI placement** (between chevrons and date label):
```tsx
<button
  onClick={() => state.resetToToday()}
  className="px-3 py-1 text-sm border border-zinc-300 rounded hover:bg-zinc-100"
>
  Aujourd'hui
</button>
```

**Behaviour:**
- Button is visually **disabled / greyed out** when the current week is already displayed
- Scrolls the time grid to the current hour after navigating back

---

## NF-02 · Responsive layout — mobile & tablet support (Outlook-inspired)

### Problem
The calendar is completely unusable on mobile and tablet. It relies on fixed pixel widths, no Tailwind breakpoints, and a mandatory 5-column week view. There is no touch-optimised event interaction.

### Proposed Solution
Adopt a layout inspired by **Microsoft Outlook mobile**:

| Breakpoint | Layout |
|---|---|
| `< 640px` (mobile) | Single-day view with bottom navigation to swipe between days |
| `640px–1024px` (tablet) | 3-day view or compact 5-day view, collapsible sidebar |
| `> 1024px` (desktop) | Current 5-day view, sidebar always visible |

---

### Implementation Plan

#### 1. Sidebar — collapsible on tablet/mobile
- On `md` and below: sidebar collapses into a slide-over drawer triggered by a hamburger icon
- Room filter and CalendarPicker accessible via the drawer
- Use Radix UI `Sheet` (or a simple `translate-x` CSS transition)

**Files:** `src/app/calendar/page.tsx`, new `src/components/Calendar/Sidebar/Sidebar.tsx`

---

#### 2. Calendar grid — adaptive column count
Add a `viewMode: "day" | "3-day" | "week"` field to the Zustand store, defaulting to `"week"` on desktop and `"day"` on mobile (detected via `window.innerWidth` or a `useMediaQuery` hook).

- `"day"` → 1 column, `dates` contains only today
- `"3-day"` → 3 columns, `dates` contains 3 days from Monday
- `"week"` → current 5 columns

**Files:** `src/app/calendar/store/calendarStore.tsx`, `src/components/Calendar/main.tsx`

---

#### 3. Header — compact on mobile
- Mobile: show only the current day name + date (e.g. "Jeudi 3 avr.")
- Replace text date range with a tappable date that opens the CalendarPicker drawer
- "Today" button (NF-01) remains visible on all breakpoints

**Files:** `src/components/Calendar/main.tsx`

---

#### 4. Event cards — touch-friendly
- Minimum tap target: `44px` height (per WCAG 2.5.5)
- Resize handles (top/bottom) enlarged on touch devices (`h-4` instead of `h-3`)
- Drag-and-drop replaced by a long-press → modal edit on mobile (no drag on touch)

**Files:** `src/components/Calendar/calendaritem/calendaritem.tsx`

---

#### 5. Day navigation on mobile
- Bottom bar with `<` prev day · date label · next day `>` arrows
- Swipe left/right gesture on the calendar grid advances/retreats by one day

**Files:** new `src/components/Calendar/MobileNav/MobileNav.tsx`

---

#### 6. Room filter — chips on mobile
- Replace full toggle list with horizontal scrollable **color chips** at the top of the grid on mobile
- Tapping a chip toggles the room filter

**Files:** `src/components/RoomFilter/roomfilter.tsx`

---

### Tailwind breakpoint strategy

All existing classes remain unchanged (desktop-first preserved). Add responsive variants:

```
sm:   ≥ 640px   tablet portrait
md:   ≥ 768px   tablet landscape  
lg:   ≥ 1024px  desktop (current behaviour)
```

No component should break at `lg:` and above — all changes are additive using `lg:` to restore current desktop behaviour where needed.

---

### Design References
- Microsoft Outlook iOS/Android: single-day scroll, bottom day-picker bar, collapsible agenda
- Google Calendar mobile: compact chips for calendar selection, FAB for new event
