# Booking Room

A conference and meeting room reservation system built with Next.js. Employees can browse room availability, create and manage bookings through an interactive calendar, and view real-time occupancy on dedicated TV displays. Authentication is handled via Microsoft OAuth2.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js, React 18, TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL 14 + Drizzle ORM |
| State | Zustand, React Query, SWR |
| Auth | Microsoft OAuth2 + JWT (cookies) |
| Package manager | Bun |

## Prerequisites

- [Bun](https://bun.sh/)
- [Docker](https://www.docker.com/) (for the PostgreSQL database)
- A Microsoft Azure app registration with OAuth2 credentials

## Environment Variables

Create a `.env.local` file at the root:

```bash
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-password
POSTGRES_DB=booking_room
DATABASE_URL=postgresql://postgres:your-password@localhost:5433/booking_room

# Microsoft OAuth
MICROSOFT_TENANT_ID=your-azure-tenant-id
MICROSOFT_CLIENT_ID=your-azure-client-id
MICROSOFT_CLIENT_SECRET=your-azure-client-secret
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/auth/microsoft?action=callback
MICROSOFT_SCOPES=https://graph.microsoft.com/.default

# App
URL=http://localhost:3000
NODE_ENV=development
```

## Getting Started

```bash
# Install dependencies
bun install

# Start the PostgreSQL database
docker-compose up -d

# Run database migrations
bun run migrate

# Seed rooms and initial data
bun run seedrooms

# Start the development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

| Script | Description |
|---|---|
| `bun run dev` | Start development server |
| `bun run build` | Build for production |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint |
| `bun run generate` | Generate Drizzle migrations |
| `bun run migrate` | Apply pending migrations |
| `bun run seed` | Seed initial data |
| `bun run seedrooms` | Seed room data |

## Pages

| Route | Description |
|---|---|
| `/` | Login page — redirects to `/calendar` if already authenticated |
| `/calendar` | Main calendar view with event creation, editing, and room filtering |
| `/available` | Room availability overview; add `?tv=true` for TV display mode |

## API Routes

### Public
| Endpoint | Description |
|---|---|
| `GET /api/availability` | Current availability for a specific room |
| `GET /api/availablerooms` | All currently available rooms |
| `GET /api/mergeavailability` | Merged availability across rooms |

### Protected (requires valid Microsoft token)
| Endpoint | Methods | Min. role |
|---|---|---|
| `/api/events` | GET, POST, PUT, DELETE | VIEWER / EDITOR |
| `/api/events/conflicts` | GET | VIEWER |
| `/api/events/updates` | POST | EDITOR |
| `/api/rooms` | GET, POST, PUT, DELETE | VIEWER / EDITOR / ADMIN |
| `/api/user` | POST | VIEWER |

**Roles**: `VIEWER` (read-only) · `EDITOR` (full CRUD on events/rooms) · `ADMIN` (all permissions including deletion)

## Deployment

The app is deployed with [PM2](https://pm2.keymetrics.io/). Run the deploy script after building:

```bash
bun run build
./deploy.sh
```

`deploy.sh` restarts the PM2 process named `booking-room`.
