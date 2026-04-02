import dotenv from "dotenv";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { integer, pgTable } from "drizzle-orm/pg-core";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { Pool } from "pg";
import { AllTables, Rooms } from "./schema";
import { seederRooms } from "./seedRooms";

dotenv.config();

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
});

const db = drizzle(pool);

async function clearAllTables() {
  console.log("Clearing all tables...");

  for (const [tableName, item] of Object.entries(AllTables)) {
    try {
      await db.delete(item.table);
      console.log(`Cleared table: ${item.name}`);

      await db.execute(
        sql`ALTER SEQUENCE ${sql.identifier(
          `${item.name}_id_seq`
        )} RESTART WITH 1`
      );
      console.log(`Reset ID sequence for table: ${tableName}`);
    } catch (error) {
      console.error(`Error processing table ${tableName}:`, error);
    }
  }

  console.log("All tables processed.");
}

async function createNotifyFunction() {
  console.log("Creating notify_event_change function...");
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION notify_event_change() RETURNS TRIGGER AS $$
    DECLARE
      payload JSON;
    BEGIN
      IF (TG_OP = 'DELETE') THEN
        payload = json_build_object(
          'operation', TG_OP,
          'id', OLD.id
        );
      ELSE
        payload = json_build_object(
          'operation', TG_OP,
          'id', NEW.id,
          'record', row_to_json(NEW)
        );
      END IF;
      
      PERFORM pg_notify('event_changes', payload::text);
      IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
      ELSE
        RETURN NEW;
      END IF;
    END;
    $$ LANGUAGE plpgsql;
  `);
  console.log("notify_event_change function created successfully.");
}

async function createTrigger() {
  console.log("Creating event_change_trigger...");
  await db.execute(sql`
    DROP TRIGGER IF EXISTS event_change_trigger ON events;
    CREATE TRIGGER event_change_trigger
    AFTER INSERT OR UPDATE OR DELETE ON events
    FOR EACH ROW EXECUTE FUNCTION notify_event_change();
  `);
  console.log("event_change_trigger created successfully.");
}

async function seed() {
  console.log("Deleting all entries in table...");
  await clearAllTables();

  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./src/drizzle" });

  console.log("Setting up real-time update function and trigger...");
  await createNotifyFunction();
  await createTrigger();

  console.log("Seeding database...");
  try {
    const table = pgTable("table", {
      int: integer("int"),
    });

    // Insert seed data
    await db.insert(Rooms).values(seederRooms);

    // Uncomment if you want to insert Events
    // await db.insert(Events).values(mockup);

    console.log("Seeding completed successfully.");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    await pool.end();
  }
}

seed().catch((error) => {
  console.error("Seeding process failed:", error);
  process.exit(1);
});
