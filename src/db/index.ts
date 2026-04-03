import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

// Dedicated pool for SSE LISTEN/NOTIFY connections.
// SSE clients hold a connection open indefinitely, so they must not compete
// with regular API requests for slots in the shared pool.
// idleTimeoutMillis reclaims connections from tabs that closed without firing
// the abort signal (known Next.js 14 limitation).
export const ssePool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 50,
  idleTimeoutMillis: 60_000,
});

export const db = drizzle(pool, { schema });
