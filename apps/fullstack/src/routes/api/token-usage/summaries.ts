import { createServerFileRoute } from "@tanstack/react-start/server";
import { z } from "zod";
import { tokenUsageRepo } from "../../../lib/cost-tracking/token-usage.repo";

const querySchema = z.object({
  customerId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  modelId: z.string().uuid().optional(),
  periodType: z.enum(["hour", "day", "week", "month"]).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const ServerRoute = createServerFileRoute(
  "/api/token-usage/summaries"
).methods({
  GET: async ({ request }) => {
    try {
      const url = new URL(request.url);
      const params = Object.fromEntries(url.searchParams);

      const query = querySchema.parse(params);

      const filters = {
        customerId: query.customerId,
        agentId: query.agentId,
        modelId: query.modelId,
        periodType: query.periodType,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
      };

      const summaries = await tokenUsageRepo.getTotalUsage(filters);

      return new Response(JSON.stringify({ summaries }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return new Response(
          JSON.stringify({
            error: "Invalid parameters",
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

      console.error("Error fetching token usage summaries:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }
  },
});
