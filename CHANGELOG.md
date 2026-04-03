# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-04-03

### Added 🆕

- **Real-time sync via SSE** — all open sessions update within ~1–2 s when any event is created, updated, or deleted (PostgreSQL `LISTEN/NOTIFY` → SSE → Zustand store). Fallback short-polling every 30 s.
- **Responsive layout** — collapsible sidebar, day/week toggle, mobile navigation bar
- **"Aujourd'hui" button** — navigate back to current week in one click
- **Token refresh** — access tokens are proactively refreshed before expiry; sessions no longer silently expire mid-day
- **Rate limiting** — API endpoints protected (100 req/min general, 10 req/min on auth routes)
- **Audit logs** — every event create/update/delete is recorded with user and society context
- **Correlation IDs** — every API error includes a unique ID for easier debugging

### Fixed 🐛

- **Drag-to-create form not appearing when a conflicting event exists** — `CalendarItem` was keyed by array index; when conflict-sorting reordered events, React reused the existing component's closed modal state instead of mounting a fresh one. Fixed by keying on `item.id`.
- **`"use server"` crash on calendar page** — `revalidateTag.ts` exported a synchronous function as default while marked `"use server"`, crashing the entire calendar SSR render.
- **SSL cert error on server-side fetches** — Next.js server components were fetching the public `https://` URL from Node.js, which failed certificate chain verification. Fixed to use `http://localhost:PORT` server-side.
- **`e.flatMap is not a function` crash** — `getAllEvents()` now returns `[]` on API error instead of throwing.
- **`TypeError: Cannot read properties of undefined (reading 'givenName')`** — POST `/api/events` now returns `{ ...created, user }` so the newly inserted calendar item has user data immediately.
- **Optimistic insert** — created events now appear instantly in the calendar without requiring a manual page action.
- **Drag-drop update returning 422** — empty description on drag-drop update was rejected by Zod; now defaults to `""`.
- **Toast inconsistency** — all event mutations (create/update/delete) now show consistent loading → success/error toasts.
- **Microsoft OAuth `no code provided` error** — was caused by wrong `MICROSOFT_TENANT_ID=common`; fixed to use the correct tenant ID. Callback now surfaces Microsoft's actual error message.
- **Calendar scroll stutter on load** — eliminated layout thrash on initial render.
- **Room colors not rendering** — server DB had Tailwind class names (`bg-red`) instead of hex values; updated all 19 rooms to hex equivalents.
- **`society_id` column missing** — `events` table was missing the column despite migrations; applied `ALTER TABLE` + backfill.
- **Resize handles and move preview** — fixed visual glitches with drag-resize handles on calendar items.
- **Room filter switches** — inline `backgroundColor` now used so room color dots render correctly.

### Changed 📢

- **Security overhaul (Phases 1–7)** — removed `@ts-nocheck`, fixed auth bypass, added CSRF state validation, Zod request validation on all endpoints, typed error responses with HTTP status codes, SSE dedicated DB connection pool, multi-tenancy headers, token caching, Next.js cache tags, `useMemo` optimisations.
- **Roles** — all `EDITOR` users promoted to `ADMIN`. New users default to `VIEWER`.
- **Dependencies** — removed unused `@prisma/client`, `next-auth`, `@uidotdev/usehooks`.

## [1.1.0] - 2024-09-12

### Added 🆕

- Room name next to the title of the booking
- Workaround with Firefox, you now have to use right click in order to create an event with the drag action (Left click still not supported as of right now : 1.1.0)
- Rooms 2-4, 2-3, 2-2
- Only filter one room and reset all filters
- Scrollview for the rooms in order to prevent long stretch of the window and hide the calendar
- New icon 😎

### Changed 📢

- Change filter behavior that previously made it unable to click on the div or on the switch button
- Possibility to now add 2 events that have conflictual dateStart and dateEnd (EventA books 1-8 that goes from 10:00 to 12:00, EventB books 1-8 that goes from 12:00 to 14:00)
- More security on token gestion
- No more selecting the name of the event by highlighting by mistake

## [1.0.0] - 2024-09-06

Application in production ! 🎉
