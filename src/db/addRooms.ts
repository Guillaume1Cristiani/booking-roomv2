import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from ".";
import { Rooms } from "./schema";
import { addRooms } from "./seedRooms";

const db = drizzle(pool);

async function seedRooms() {
  await db.insert(Rooms).values(addRooms);
}
seedRooms();
