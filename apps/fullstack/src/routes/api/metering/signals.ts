import { json } from "@tanstack/react-start";
import { createServerFileRoute } from "@tanstack/react-start/server";
import { z } from "zod";
import { agentRepository } from "~/lib/agents/agents.repo";
import { customerRepository } from "~/lib/customers/customer.repo";
import { signalLogRepository } from "~/lib/signals/signal-logs.repo";
import { signalRepository } from "~/lib/signals/signals.repo";

const trackSignalSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  agentId: z.string().min(1, "Agent ID is required"),
  signalId: z.string().min(1, "Signal ID is required"),
  metadata: z.record(z.any()).optional(),
});

export const ServerRoute = createServerFileRoute(
  "/api/metering/signals"
).methods({
  POST: async ({ request }) => {
    try {
      const body = await request.json();
      const { customerId, agentId, signalId, metadata } =
        trackSignalSchema.parse(body);

      const agent = await agentRepository.findByFriendlyIdentifier(agentId);
      if (!agent) {
        return json({ error: "agentId not found" }, { status: 404 });
      }

      const customer = await customerRepository.findById(customerId);
      if (!customer) {
        return json({ error: "customerId not found" }, { status: 404 });
      }

      const signal = await signalRepository.findByFriendlyIdentifier(signalId);
      if (!signal) {
        return json({ error: "signalId not found" }, { status: 404 });
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
