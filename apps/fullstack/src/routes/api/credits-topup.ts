import { json } from "@tanstack/react-start";
import { createServerFileRoute } from "@tanstack/react-start/server";
import { z } from "zod";
import { createCreditAllocation } from "~/lib/customers/customer.functions";

const topupSchema = z.object({
  customerId: z.string(),
  agentSlug: z.string(),
  signalSlug: z.string(),
  creditsCents: z.number(),
  priceTotal: z.number().optional(),
});

export const ServerRoute = createServerFileRoute("/api/credits-topup").methods({
  POST: async ({ request }) => {
    try {
      const body = await request.json();
      const { customerId, agentSlug, signalSlug, creditsCents, priceTotal } = topupSchema.parse(body);
      
      // Import repositories to resolve slugs to IDs
      const { agentRepository } = await import("~/lib/agents/agents.repo");
      const { signalRepository } = await import("~/lib/signals/signals.repo");
      
      // Get agent by slug
      const agent = await agentRepository.findBySlug(agentSlug);
      if (!agent) {
        return json({ error: "Agent not found" }, { status: 404 });
      }
      
      // Get signal by slug
      const signal = await signalRepository.findBySlug(signalSlug);
      if (!signal || signal.agentId !== agent.id) {
        return json({ error: "Signal not found or does not belong to agent" }, { status: 404 });
      }
      
      // Call createCreditAllocation with resolved IDs
      const result = await createCreditAllocation({ 
        data: {
          customerId,
          agentId: agent.id,
          signalId: signal.id,
          creditsCents,
          priceTotal,
        }
      });
      
      return json({ success: true, result });
    } catch (error) {
      console.error("Credits topup error:", error);
      return json(
        { error: error instanceof Error ? error.message : "Failed" },
        { status: 400 }
      );
    }
  },
});