# Implementation Plan — Booking Room v2

Source of truth: `instructions/features.md` (22 features, F-01 → F-22)

The work is broken into 7 incremental phases, ordered so that each phase is safe to ship independently and never requires undoing a previous phase. Dependencies flow downward.

---

## SSE Scalability Assessment

The current real-time implementation uses **SSE + PostgreSQL `LISTEN/NOTIFY`**: each connected browser holds one dedicated `pool.connect()` connection open indefinitely.

**Why this is a problem at 12+ users:**
- 12 open SSE connections = 12 pool connections permanently consumed
- Regular API requests compete for the same pool — at peak, requests will queue or fail
- `client.setMaxListeners(500)` only silences a Node.js warning; it does not increase pool capacity

**Decision: keep SSE + LISTEN/NOTIFY (it is the right pattern for a single PM2 server), but fix the pool problem.**

Add **F-23** below: create a *dedicated* `pg.Pool` for SSE subscriptions (sized to max expected concurrent users) so it never starves the API pool. This is addressed in Phase 3 alongside the architecture refactor.

---

## Phase 1 — Quick Wins & Cleanup
*Isolated, low-risk changes. No schema changes, no auth refactoring.*

| Todo ID | Feature | Files touched |
|---|---|---|
| p1-f22 | F-22 Remove unused deps (`@prisma/client`, `next-auth`, `@uidotdev/usehooks`) | `package.json` |
| p1-f05 | F-05 Move hardcoded tenant ID to `MICROSOFT_TENANT_ID` env var | `src/app/api/auth/microsoft/route.ts`, `.env.local` |
| p1-f09 | F-09 Fix broken Zustand action `updateIsPreviewDisplay` (undefined `isDisplay`) | `src/app/calendar/store/calendarStore.tsx` |
| p1-f19 | F-19 Fix async/await in `EventForm` submit handler; fix `toast.error()` call | `src/components/Calendar/calendaritem/EventForm.tsx` |
| p1-f04 | F-04 Replace raw `sql\`\`` date templates with Drizzle `gte`/`lte` operators | `src/app/api/(protected)/events/route.ts` |

---

## Phase 2 — Security
*Must be complete before any production deployment.*

| Todo ID | Feature | Files touched |
|---|---|---|
| p2-f01 | F-01 Fix authorization bypass: user endpoint must resolve identity from token, not request body | `src/app/api/(protected)/user/route.ts` |
| p2-f02 | F-02 Replace static CSRF state `"12345"` with per-request random token | `src/app/api/auth/microsoft/route.ts`, `src/middleware.ts` |
| p2-f03 | F-03 Add Zod schemas and validate all `POST`/`PUT` bodies before DB insert (events, rooms, user) | `src/app/api/(protected)/events/route.ts`, `rooms/route.ts`, `user/route.ts`, new `src/lib/schemas.ts` |

---

## Phase 3 — Architecture Refactor
*Structural changes. Higher risk — requires testing after each item.*

| Todo ID | Feature | Files touched |
|---|---|---|
| p3-f07 | F-07 Consolidate auth: validate once in middleware, pass resolved user via request header; strip duplicate Graph API calls from route handlers | `src/middleware.ts`, `src/lib/middleware/validateMicrosoftToken.ts`, `src/app/utils/microsoftqueries.ts`, all `(protected)` routes |
| p3-f08 | F-08 Extract `EventForm` business logic into `useEventSubmit` hook | `src/components/Calendar/calendaritem/EventForm.tsx`, new `src/lib/hooks/useEventSubmit.ts` |
| p3-f10 | F-10 Add `society_id` to `Events` schema, generate & apply migration, filter all event queries by society | `src/db/schema.ts`, `src/lib/event.ts`, all event routes, new migration |
| p3-f23 | F-23 Dedicated SSE connection pool | Create a second `pg.Pool` (`ssePool`, max ~30) for `LISTEN/NOTIFY` connections so SSE clients never compete with API requests for pool slots. Files: `src/db/index.ts`, `src/app/api/(protected)/events/updates/route.ts` |

---

## Phase 4 — Type Safety
*Clean up TypeScript debt. Depends on Phase 3 (arch refactor) being stable.*

| Todo ID | Feature | Files touched |
|---|---|---|
| p4-f17 | F-17 Narrow `subTag_id` to `number` everywhere | `src/components/Calendar/types/types.ts`, call sites |
| p4-f15 | F-15 Replace `<User>{}` assertion with `null` + update call sites | `src/app/utils/microsoftqueries.ts`, callers |
| p4-f16 | F-16 Define `ServerSentEvent` union type for SSE handler | `src/app/api/(protected)/events/updates/route.ts` |
| p4-f14 | F-14 Remove all `@ts-nocheck`; fix real type errors in events route, calendarStore, time.ts | `events/route.ts`, `calendarStore.tsx`, `src/lib/time.ts` |

---

## Phase 5 — Error Handling
*Requires Phase 3 so route handler shapes are stable.*

| Todo ID | Feature | Files touched |
|---|---|---|
| p5-f18 | F-18 Map DB errors → 409, not-found → 404, validation → 400; add correlation ID logging | all `(protected)` routes, new `src/lib/errors.ts` |

---

## Phase 6 — Performance
*Safe to do any time after Phase 2 is in place.*

| Todo ID | Feature | Files touched |
|---|---|---|
| p6-f11 | F-11 Add in-memory token validation cache in middleware (TTL = token remaining lifetime) | `src/lib/middleware/validateMicrosoftToken.ts`, `src/middleware.ts` |
| p6-f12 | F-12 Add `next: { tags: ["events"] }` to `getAllEvents`; call `revalidateTag("events")` on mutations | `src/app/utils/queries.ts`, `src/app/data/events.ts`, event route handlers |
| p6-f13 | F-13 Wrap `transformStringtoInset` calls in `useMemo` in calendar item component | `src/components/Calendar/calendaritem/calendaritem.tsx` |

---

## Phase 7 — New Features
*Added value on top of a clean, secure foundation.*

| Todo ID | Feature | Files touched |
|---|---|---|
| p7-f06 | F-06 Implement token refresh: persist refresh token, auto-refresh before expiry | `src/app/api/auth/microsoft/route.ts`, `src/middleware.ts`, new `src/lib/auth/refreshToken.ts` |
| p7-f20 | F-20 Add sliding-window rate limiting to all API endpoints | `src/middleware.ts`, new `src/lib/rateLimit.ts` |
| p7-f21 | F-21 Add `audit_logs` table + log all mutations (create/update/delete events & rooms) | `src/db/schema.ts`, `src/lib/event.ts`, room routes, new migration |

---

## Dependency graph

```
Phase 1 (quick wins)
    └── Phase 2 (security)
            └── Phase 3 (architecture)
                    ├── Phase 4 (type safety)
                    └── Phase 5 (error handling)
Phase 2 ──────────── Phase 6 (performance)
Phase 3 + Phase 6 ── Phase 7 (new features)
```

## Notes
- Each phase should end with `bun run lint && bun run build` passing before starting the next.
- Phase 3 (F-10 multi-tenancy) requires a DB migration — coordinate with any live data before applying.
- F-06 (token refresh) is the most complex item in Phase 7; it may require adding a `refresh_token` column to the `User` table or a separate server-side session store.
