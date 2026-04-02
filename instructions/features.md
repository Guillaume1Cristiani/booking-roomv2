# Features & Fixes Backlog

Derived from the code audit. Ordered by priority.

---

## 🔴 Critical — Security

### F-01 · Fix authorization bypass on user endpoint
**Audit ref:** #4  
The `/api/user` endpoint accepts any `microsoft_id` from the request body, allowing any authenticated user to fetch another user's data. The endpoint must resolve the current user solely from the validated token, not from user-supplied input.

### F-02 · Replace hardcoded CSRF state with per-request random token
**Audit ref:** #7  
The OAuth state parameter is hardcoded to `"12345"`. Generate a cryptographically random state per login attempt, store it in a short-lived cookie, and validate it on the callback before exchanging the code.

### F-03 · Add Zod input validation on all route handlers
**Audit ref:** #3, #24  
All `POST` / `PUT` route handlers pass raw `request.json()` directly to Drizzle. Define a Zod schema for every resource (events, rooms, user) and parse the body before any DB operation. This also prevents stored-XSS via text fields.

### F-04 · Fix date query to use parameterized Drizzle operators
**Audit ref:** #5  
Date filters in the events `GET` handler use raw `sql\`\`` template strings. Replace with Drizzle's typed `gte` / `lte` operators with validated `Date` objects to keep full parameterization.

### F-05 · Move Microsoft tenant ID to environment variable
**Audit ref:** #6  
The Azure tenant ID is hardcoded in the auth route URL. Move it to `MICROSOFT_TENANT_ID` in `.env.local` and add startup validation (e.g. with Zod env schema) so missing variables fail fast at boot.

### F-06 · Implement token refresh mechanism
**Audit ref:** #1  
The app stores the MS access token in a cookie but never refreshes it. Persist the refresh token (server-side or encrypted cookie), and refresh the access token before it expires so sessions stay alive without re-login.

---

## ❌ Architecture

### F-07 · Consolidate auth into middleware — remove duplication from route handlers
**Audit ref:** #8  
Token validation and user lookup happen in `middleware.ts` **and** again inside individual route handlers, resulting in 3 MS Graph API calls per request. Validate once in middleware, attach the resolved user to a request header or Next.js context, and remove the duplicate calls from route handlers.

### F-08 · Extract business logic out of EventForm component
**Audit ref:** #9  
Room lookup, conflict validation, and API orchestration all live inside `EventForm.tsx`'s `onSubmit`. Move this logic to a dedicated utility or custom hook (e.g. `useEventSubmit`) so the component only handles form state and UI feedback.

### F-09 · Fix broken Zustand action `updateIsPreviewDisplay`
**Audit ref:** #10  
The action references an undefined variable `isDisplay` and will throw at runtime if called. Either fix the implementation or remove the dead action from the store.

### F-10 · Add `society_id` to Events table and enforce multi-tenancy
**Audit ref:** #11  
Events have no `society_id` foreign key, meaning users can read and mutate events across organisations. Add `society_id` to the Events schema, generate and apply a migration, and filter all event queries by the current user's `society_id`.

---

## 🐢 Performance

### F-11 · Cache MS token validation in middleware
**Audit ref:** #2, #12  
Each protected request makes up to 3 calls to the MS Graph API. Introduce a short-lived in-memory or Redis cache keyed by token hash, with a TTL matching the token's remaining lifetime, to reduce external calls to one per session.

### F-12 · Add Next.js cache tags to `getAllEvents`
**Audit ref:** #13  
`getAllEvents()` fetches all events on every page load with no caching. Add `next: { tags: ["events"], revalidate: 60 }` to the fetch call and call `revalidateTag("events")` on mutations so the cache is invalidated correctly.

### F-13 · Memoize `transformStringtoInset` in calendar render
**Audit ref:** #14  
The date-to-inset transformation is called ~500× per render. Wrap calls in `useMemo` keyed on `dateStart` / `dateEnd` to avoid redundant recalculations on every re-render.

---

## 🔧 TypeScript

### F-14 · Remove all `@ts-nocheck` and fix underlying type errors
**Audit ref:** #16  
`@ts-nocheck` is used in `events/route.ts`, `calendarStore.tsx`, and `time.ts` to silence real compiler errors. Fix the actual issues (e.g. use `db.select().from(Events).innerJoin(...)` and map the result correctly) and remove every `@ts-nocheck` directive.

### F-15 · Replace empty User type assertion with explicit error or null
**Audit ref:** #17  
`microsoftqueries.ts` returns `<User>{}` on failure, giving callers a fully undefined object typed as `User`. Return `null` and update call sites to handle `User | null`, or throw a typed error.

### F-16 · Replace `any` with proper types in SSE handler
**Audit ref:** #18  
The SSE `sendEvent` function in `events/updates/route.ts` accepts `any`. Define a `ServerSentEvent` union type that covers all event shapes sent over the stream.

### F-17 · Narrow `subTag_id` type to `number`
**Audit ref:** #19  
`EventsResponse.subTag_id` is typed `number | string`. Since this is a DB primary-key reference it should always be `number`. Remove the `string` branch and fix any call sites that produce strings.

---

## ⚠️ Error Handling

### F-18 · Return specific HTTP status codes and error types from route handlers
**Audit ref:** #20  
All catch blocks return a generic 500 with the same message. Map DB constraint errors to 409, not-found to 404, and validation errors to 400. Log the full error server-side with a correlation ID returned to the client.

### F-19 · Fix async/await usage in EventForm submit handler
**Audit ref:** #21  
`createEvent()` is called without `await`, then chained with `.then()`. Rewrite the handler as a proper `async/await` block, fix the `toast.error()` call signature, and ensure `setDisable(false)` is always called in a `finally` block.

---

## 🚫 Missing Features

### F-20 · Add rate limiting to all API endpoints
**Audit ref:** #22  
No endpoint is protected against brute-force or flood attacks. Implement sliding-window rate limiting in middleware (e.g. with Upstash Ratelimit or a local in-memory limiter) and return `429 Too Many Requests` when exceeded.

### F-21 · Add audit logging for all data mutations
**Audit ref:** #23  
There is no record of who created, modified, or deleted events or rooms. Log each mutation (action, `userId`, `resourceId`, timestamp) to a dedicated `audit_logs` table or an external logging service.

### F-22 · Remove unused dependencies
**Audit ref:** #15  
`@prisma/client`, `next-auth`, and `@uidotdev/usehooks` are installed but not used. Remove them to reduce bundle size and maintenance surface.

---

## Summary

| ID | Area | Priority |
|---|---|---|
| F-01 | Security | 🔴 Critical |
| F-02 | Security | 🔴 Critical |
| F-03 | Security | 🔴 Critical |
| F-04 | Security | 🔴 Critical |
| F-05 | Security | 🔴 Critical |
| F-06 | Security | 🔴 Critical |
| F-07 | Architecture | 🟠 High |
| F-08 | Architecture | 🟠 High |
| F-09 | Architecture | 🟠 High |
| F-10 | Architecture | 🟠 High |
| F-11 | Performance | 🟠 High |
| F-12 | Performance | 🟠 High |
| F-13 | Performance | 🟡 Medium |
| F-14 | TypeScript | 🟠 High |
| F-15 | TypeScript | 🟡 Medium |
| F-16 | TypeScript | 🟡 Medium |
| F-17 | TypeScript | 🟡 Medium |
| F-18 | Error Handling | 🟠 High |
| F-19 | Error Handling | 🟠 High |
| F-20 | Missing Feature | 🟠 High |
| F-21 | Missing Feature | 🟡 Medium |
| F-22 | Missing Feature | 🟡 Medium |
