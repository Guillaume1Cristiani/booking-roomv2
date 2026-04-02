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
export const ssePool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 30,
});

export const db = drizzle(pool, { schema });
