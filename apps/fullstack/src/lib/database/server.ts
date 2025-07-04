// Server-only database exports - contains Node.js dependencies
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { initializePgCron } from "./pg-cron-init";

import "dotenv/config";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool, { schema });

// Initialize pg_cron in the background (non-blocking)
initializePgCron().catch(() => {
  // Silently ignore errors - pg_cron is optional
});

// Export all schema tables and functions
export * from "./schema";
