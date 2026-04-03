#!/bin/bash
set -e

echo "▶ Installing dependencies..."
npm ci --production

echo "▶ Building Next.js..."
npm run build

echo "▶ Applying DB migrations..."
npx drizzle-kit migrate

echo "▶ Ensuring Postgres NOTIFY trigger exists..."
# Idempotent — safe to run on every deploy
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(\`
  CREATE OR REPLACE FUNCTION notify_event_change() RETURNS TRIGGER AS \\\$\\\$
  DECLARE payload JSON;
  BEGIN
    IF (TG_OP = 'DELETE') THEN
      payload = json_build_object('operation', TG_OP, 'id', OLD.id);
    ELSE
      payload = json_build_object('operation', TG_OP, 'id', NEW.id, 'record', row_to_json(NEW));
    END IF;
    PERFORM pg_notify('event_changes', payload::text);
    IF (TG_OP = 'DELETE') THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END;
  \\\$\\\$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS event_change_trigger ON events;
  CREATE TRIGGER event_change_trigger
  AFTER INSERT OR UPDATE OR DELETE ON events
  FOR EACH ROW EXECUTE FUNCTION notify_event_change();
\`).then(() => { console.log('Trigger OK'); pool.end(); }).catch(e => { console.error(e); pool.end(); process.exit(1); });
"

echo "▶ Restarting app with PM2..."
pm2 stop booking-room 2>/dev/null || true
pm2 start npm --name "booking-room" -- start

echo "✅ Deploy complete"
