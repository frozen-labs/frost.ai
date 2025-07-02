import { json } from "@tanstack/react-start";
import { createServerFileRoute } from "@tanstack/react-start/server";
import { z } from "zod";
import { agentRepository } from "~/lib/agents/agents.repo";
import { customerRepository } from "~/lib/customers/customer.repo";
import { signalLogRepository } from "~/lib/signals/signal-logs.repo";
import { signalRepository } from "~/lib/signals/signals.repo";

const trackSignalSchema = z.object({
  customerSlug: z.string().min(1, "Customer slug is required"),
  agentSlug: z.string().min(1, "Agent slug is required"),
  signalSlug: z.string().min(1, "Signal slug is required"),
  metadata: z.record(z.any()).optional(),
});

export const ServerRoute = createServerFileRoute(
  "/api/metering/signals"
).methods({
  POST: async ({ request }) => {
    try {
      const body = await request.json();
      const { customerSlug, agentSlug, signalSlug, metadata } =
        trackSignalSchema.parse(body);

      // Find agent by slug
      const agent = await agentRepository.findBySlug(agentSlug);
      if (!agent) {
        return json({ error: "Agent not found" }, { status: 404 });
      }

      // Find customer by slug
      const customer = await customerRepository.findBySlug(customerSlug);
      if (!customer) {
        return json({ error: "Customer not found" }, { status: 404 });
      }

      // Find signal by slug
      const signal = await signalRepository.findBySlug(signalSlug);
      if (!signal) {
        return json({ error: "Signal not found" }, { status: 404 });
      }

      const signalLog = await signalLogRepository.create({
        agentSignalId: signal.id,
        customerId: customer.id,
        metadata: metadata || {},
      });

      return json({
        success: true,
        signalLogId: signalLog.id,
        message: "Signal tracked successfully",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return json(
          {
            error: "Validation failed",
            details: error.errors,
          },
          { status: 400 }
        );
      }

      console.error("Error tracking signal:", error);
      return json({ error: "Internal server error" }, { status: 500 });
    }
  },
});
