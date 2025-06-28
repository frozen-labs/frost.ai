import { defineConfig } from "drizzle-kit";

import "dotenv/config";

export default defineConfig({
  schema: "./src/lib/database/schema.ts",
  out: "./src/lib/database/drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
