# Copilot Instructions — Booking Room

A conference and meeting room reservation system built with Next.js. Employees browse room availability, create/manage bookings via an interactive calendar, and view real-time occupancy on TV displays. Auth is handled via Microsoft OAuth2.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14+, React 18, TypeScript |
| Styling | Tailwind CSS + clsx/tailwind-merge |
| Database | PostgreSQL 14 + Drizzle ORM |
| State | Zustand (calendar UI), React Query, SWR |
| Auth | Microsoft OAuth2 + JWT (httpOnly cookies) |
| Forms | React Hook Form |
| Package manager | Bun |

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── (protected)/        # Requires valid MS token + role check
│   │   │   ├── events/         # GET, POST, PUT, DELETE
│   │   │   ├── rooms/          # GET, POST, PUT, DELETE
│   │   │   └── user/           # POST
│   │   ├── (public)/           # No auth required
│   │   │   ├── availability/
│   │   │   ├── availablerooms/
│   │   │   └── mergeavailability/
│   │   └── auth/
│   │       ├── microsoft/      # OAuth login + callback
│   │       └── signout/
│   ├── available/              # TV display mode (?tv=true)
│   ├── calendar/               # Main calendar UI + Zustand store
│   ├── data/                   # Client-side data utilities
│   ├── types/                  # Shared TypeScript types
│   └── utils/                  # apiHandler, queries, helpers
├── components/                 # Feature-based UI components
├── db/                         # Drizzle schema, seed scripts
├── lib/
│   ├── middleware/             # Token validation, role checks
│   ├── event.ts                # Event CRUD + conflict detection
│   └── ...
├── styles/
└── middleware.ts               # Next.js middleware (auth + routing)
```

## Architecture & Conventions

### API Routes
- Each `route.ts` handles all HTTP methods for that resource.
- Routes are split into `(protected)` and `(public)` folder groups.
- All protected routes are enforced by `src/middleware.ts` — **no need for auth checks inside route handlers**.

### Auth Flow
1. User logs in via Microsoft OAuth (`/api/auth/microsoft?action=login`).
2. On callback, a JWT is stored as a secure httpOnly cookie.
3. Every request to a protected route goes through `src/middleware.ts`:
   - Validates the token via MS Graph API (`/v1.0/me`).
   - Fetches the user from the DB by `microsoft_id`.
   - Checks role-based permissions via `protectedRoute(role, method, path)`.

### Roles & Permissions
Roles are defined as a Drizzle `pgEnum`: `VIEWER | EDITOR | ADMIN`.

| Role | Permissions |
|---|---|
| `VIEWER` | GET only (read) |
| `EDITOR` | Full CRUD (all methods) |
| `ADMIN` | Full CRUD (all methods) |

New users default to `VIEWER` on first login.

### Database (Drizzle ORM)
- Schema in `src/db/schema.ts`. Types are inferred: `typeof Events.$inferSelect`.
- DB client in `src/db/index.ts` (using `pg` Pool + `drizzle(pool, { schema })`).
- Queries use the Drizzle query builder. Example patterns:

```ts
// Select with filters
db.select().from(Events).where(and(eq(Events.room_id, id), gt(Events.dateStart, from)))

// Insert with returning
db.insert(Events).values(event).returning()

// Update
db.update(Events).set({ title }).where(eq(Events.id, id)).returning()

// Delete
db.delete(Events).where(eq(Events.id, id)).returning()

// Conflict detection (overlapping bookings)
db.select().from(Events).where(
  and(
    eq(Events.subTag_id, roomId),
    lt(Events.dateStart, newEvent.dateEnd),
    gt(Events.dateEnd, newEvent.dateStart)
  )
)
```

### Client-side Data Fetching
Use the `apiHandler` utility (`src/app/utils/apiHandler.ts`) for all client-side API calls. It wraps `fetch` with auth cookies, headers, and optional Next.js cache revalidation:

```ts
apiHandler("/api/events", { method: "POST", body: JSON.stringify(data) }, "events")
```

### State Management
- Calendar UI state lives in a Zustand store at `src/app/calendar/store/calendarStore.tsx`.
- Use the store for UI-only state (selected dates, preview events, filters).
- Use React Query / SWR for server state.

## Naming Conventions

| Context | Convention |
|---|---|
| Routes | kebab-case (`/api/available-rooms`) |
| Components | PascalCase (`EventForm`, `RoomFilter`) |
| Utilities | camelCase (`apiHandler`, `checkLogin`) |
| DB columns | snake_case in DB, camelCase in TypeScript |
| CSS | Tailwind utility classes; custom CSS only when necessary |

## Key Scripts

```bash
bun run dev          # Start dev server
bun run build        # Build for production
bun run generate     # Generate Drizzle migrations
bun run migrate      # Apply migrations
bun run seedrooms    # Seed room data
bun run lint         # ESLint
```

## Environment Variables

Required in `.env.local`:

```bash
DATABASE_URL=postgresql://postgres:password@localhost:5433/booking_room
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/auth/microsoft?action=callback
MICROSOFT_SCOPES=https://graph.microsoft.com/.default
URL=http://localhost:3000
NODE_ENV=development
```

## Guidelines for Copilot

- **Auth is handled in middleware** — do not add auth/role checks inside route handlers.
- **Always use Drizzle ORM** for DB access; never write raw SQL unless generating migration files.
- **Use `apiHandler`** for client-side API calls, not bare `fetch`.
- **Infer types from the schema** (`$inferSelect`, `$inferInsert`) instead of duplicating type definitions.
- **Conflict detection is required** when creating or updating bookings — check `src/lib/event.ts` for the pattern.
- **New migrations** must be generated with `bun run generate` and applied with `bun run migrate`.
- **Prefer server components** by default; add `"use client"` only when browser APIs or interactivity is needed.
- **Use `cn()` / `tailwind-merge`** for conditional class names, not string concatenation.
