import { json } from "@tanstack/react-start";
import { createServerFileRoute } from "@tanstack/react-start/server";
import { z } from "zod";
import { agentRepository } from "~/lib/agents/agents.repo";
import { customerRepository } from "~/lib/customers/customer.repo";
import { tokenTrackingService } from "~/lib/metering/tokens/token-tracking.service";
const trackingSchema = z.object({
  customerSlug: z.string().min(1),
  agentSlug: z.string().min(1),
  modelSlug: z.string().min(1),
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
});

export const ServerRoute = createServerFileRoute(
  "/api/metering/tokens"
).methods({
  POST: async ({ request }) => {
    try {
      const body = await request.json();
      const { customerSlug, agentSlug, modelSlug, inputTokens, outputTokens } =
        trackingSchema.parse(body);

      // Find customer by slug
      const customer = await customerRepository.findBySlug(customerSlug);
      if (!customer) {
        return json({ error: "Customer not found" }, { status: 404 });
      }

      // Find agent by slug
      const agent = await agentRepository.findBySlug(agentSlug);
      if (!agent) {
        return json({ error: "Agent not found" }, { status: 404 });
      }

      const usageId = await tokenTrackingService.trackUsage({
        customerId: customer.id,
        agentId: agent.id,
        modelId: modelSlug,
        inputTokens,
        outputTokens,
      });

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
