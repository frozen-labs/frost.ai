import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { type NewAgent } from "~/lib/database";
import { signalRepository } from "~/lib/signals/signals.repo";
import { agentRepository } from "./agents.repo";

export const getAgent = createServerFn({ method: "GET" })
  .validator(z.object({ agentId: z.string() }))
  .handler(async ({ data }) => {
    if (data.agentId === "new") {
      return null;
    }

    const agent = await agentRepository.findById(data.agentId);
    if (!agent) return null;

    const signals = await signalRepository.findByAgentId(agent.id);

    return {
      ...agent,
      signals,
    };
  });

const saveAgentSchema = z.object({
  agentId: z.string(),
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  metadata: z.object({}).optional(),
  signals: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string(),
        slug: z.string(),
        pricePerCallCents: z.number().min(0).default(0),
      })
    )
    .optional(),
});

export const saveAgent = createServerFn({ method: "POST" })
  .validator(saveAgentSchema)
  .handler(async ({ data }) => {
    const agentData: NewAgent = {
      name: data.name,
      slug: data.slug,
      metadata: data.metadata,
    };

    let agentId = data.agentId;

    if (data.agentId === "new") {
      const newAgent = await agentRepository.create(agentData);
      await signalRepository.createRange(
        data.signals?.map((signal) => ({
          name: signal.name,
          agentId: newAgent.id,
          slug: signal.slug,
          pricePerCallCents: signal.pricePerCallCents,
        })) || []
      );
      agentId = newAgent.id;
    } else {
      await agentRepository.update(data.agentId, agentData);

      // Handle signal updates for existing agents
      if (data.signals) {
        // Get current signals for comparison
        const currentSignals = await signalRepository.findByAgentId(
          data.agentId
        );

        // Separate new signals from existing ones
        const newSignals = data.signals.filter((signal) => !signal.id);
        const existingSignals = data.signals.filter((signal) => signal.id);
        const providedSignalIds = new Set(
          existingSignals.map((s) => s.id).filter(Boolean)
        );

        // Delete signals that are no longer provided
        const signalsToDelete = currentSignals.filter(
          (signal) => !providedSignalIds.has(signal.id)
        );
        for (const signal of signalsToDelete) {
          await signalRepository.delete(signal.id);
        }

        // Update existing signals
        for (const signal of existingSignals) {
          if (signal.id) {
            await signalRepository.update(signal.id, {
              name: signal.name,
              slug: signal.slug,
              pricePerCallCents: signal.pricePerCallCents,
            });
          }
        }

        // Create new signals
        if (newSignals.length > 0) {
          await signalRepository.createRange(
            newSignals.map((signal) => ({
              name: signal.name,
              agentId: data.agentId,
              slug: signal.slug,
              pricePerCallCents: signal.pricePerCallCents,
            }))
          );
        }
      }
    }

    return agentId;
  });

export const deleteAgent = createServerFn({ method: "POST" })
  .validator(z.object({ agentId: z.string() }))
  .handler(async ({ data }) => {
    await agentRepository.delete(data.agentId);
  });
