import { createServerFileRoute } from "@tanstack/react-start/server";
import { z } from "zod";
import { tokenTrackingService } from "../../../lib/cost-tracking/token-tracking.service";

const trackingSchema = z.object({
  customerId: z.string().uuid(),
  agentId: z.string().uuid(),
  provider: z.string(),
  model: z.string(),
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
  requestId: z.string().optional(),
  sessionId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const ServerRoute = createServerFileRoute(
  "/api/token-usage/track"
).methods({
  POST: async ({ request }) => {
    try {
      const body = await request.json();
      const data = trackingSchema.parse(body);

      const usageId = await tokenTrackingService.trackUsage(data);

      return new Response(JSON.stringify({ id: usageId }), {
        status: 201,
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return new Response(
          JSON.stringify({
            error: "Invalid request data",
            details: error.errors,
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }

      console.error("Error tracking token usage:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }
  },
});
