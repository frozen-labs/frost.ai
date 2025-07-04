import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    port: 3000,
  },
  // Development server configuration
  ssr: {
    noExternal: [
      // Force these to be processed by Vite in SSR mode
      "~/lib/**",
    ],
  },
  plugins: [
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    tanstackStart(),
  ],
  build: {
    rollupOptions: {
      external: [
        // PostgreSQL and database related modules
        "pg",
        "pg-native", 
        "pg-protocol",
        "pg-types",
        "pg-cursor",
        "pg-query-stream",
        "pg-pool",
        "postgres",
        "drizzle-orm/node-postgres",
        "drizzle-orm/postgres-js",
        // Node.js built-in modules
        "crypto",
        "buffer",
        "util",
        "events",
        "stream",
        "net",
        "tls",
        "dns",
        "fs",
        "path",
        "os",
      ],
    },
  },
  define: {
    // Prevent Node.js globals from being used in client-side code
    global: "globalThis",
  },
  optimizeDeps: {
    exclude: [
      // Exclude database modules from optimization
      "pg",
      "pg-native", 
      "pg-protocol",
      "drizzle-orm/node-postgres",
      "drizzle-orm/postgres-js",
    ],
  },
});
