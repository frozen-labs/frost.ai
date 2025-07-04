import { json } from "@tanstack/react-start";
import { createServerFileRoute } from "@tanstack/react-start/server";

export const ServerRoute = createServerFileRoute("/api/health/").methods({
  GET: async ({ request }) => {
    try {
      // TODO: Check database connection
      return json({ status: "ok", timestamp: new Date().toISOString() }, { status: 200 });
    } catch (error) {
      console.error("Error checking health:", error);
      return json({ error: "Internal server error" }, { status: 500 });
    }
  },
});
