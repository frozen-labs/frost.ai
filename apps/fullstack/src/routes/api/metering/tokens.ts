import { json } from "@tanstack/react-start";
import { createServerFileRoute } from "@tanstack/react-start/server";
import { z } from "zod";
import { tokenTrackingService } from "~/lib/metering/tokens/token-tracking.service";
const trackingSchema = z.object({
  customerId: z.string().uuid(),
  agentId: z.string().uuid(),
  modelId: z.string(),
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
});

export const ServerRoute = createServerFileRoute(
  "/api/metering/tokens"
).methods({
  POST: async ({ request }) => {
    try {
      const body = await request.json();
      const data = trackingSchema.parse(body);

      const usageId = await tokenTrackingService.trackUsage(data);

      return json({ id: usageId }, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return json(
          {
            error: "Invalid request data",
            details: error.errors,
          },
          { status: 400 }
        );
      }

      console.error("Error tracking token usage:", error);
      return json({ error: "Internal server error" }, { status: 500 });
    }
  },
});
