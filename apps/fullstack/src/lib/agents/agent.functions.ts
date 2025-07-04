import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { type NewAgent, SIGNAL_TYPES } from "~/lib/database";
import { agentRepository } from "./agents.repo";
import { signalRepository } from "~/lib/signals/signals.repo";

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
  setupFeeEnabled: z.boolean().optional(),
  setupFeeCents: z.number().optional(),
  platformFeeEnabled: z.boolean().optional(),
  platformFeeCents: z.number().optional(),
  platformFeeBillingCycle: z.enum(['monthly', 'yearly']).optional(),
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
  outcomeSignals: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string(),
        slug: z.string(),
        pricePerCallCents: z.number().min(0).default(0),
      })
    )
    .optional(),
  creditSignals: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string(),
        slug: z.string(),
        creditsPerCallCents: z.number().min(0).default(0),
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
      setupFeeEnabled: data.setupFeeEnabled,
      setupFeeCents: data.setupFeeCents,
      platformFeeEnabled: data.platformFeeEnabled,
      platformFeeCents: data.platformFeeCents,
      platformFeeBillingCycle: data.platformFeeBillingCycle,
    };

    let agentId = data.agentId;

    if (data.agentId === "new") {
      const newAgent = await agentRepository.create(agentData);
      agentId = newAgent.id;
      
      // Create all signal types for new agent
      const allSignals = [
        ...(data.signals?.map(signal => ({
          ...signal,
          agentId: newAgent.id,
          signalType: SIGNAL_TYPES.USAGE,
          pricePerCallCents: signal.pricePerCallCents,
        })) || []),
        ...(data.outcomeSignals?.map(signal => ({
          ...signal,
          agentId: newAgent.id,
          signalType: SIGNAL_TYPES.OUTCOME,
          outcomePriceCents: signal.pricePerCallCents,
          pricePerCallCents: 0,
        })) || []),
        ...(data.creditSignals?.map(signal => ({
          ...signal,
          agentId: newAgent.id,
          signalType: SIGNAL_TYPES.CREDIT,
          creditsPerCallCents: signal.creditsPerCallCents,
          pricePerCallCents: 0,
        })) || []),
      ];
      
      if (allSignals.length > 0) {
        await signalRepository.createRange(allSignals);
      }
    } else {
      await agentRepository.update(data.agentId, agentData);

      // Handle signal updates for existing agents
      const currentSignals = await signalRepository.findByAgentId(data.agentId);
      
      // Process all signal types
      const allProvidedSignals = [
        ...(data.signals?.map(s => ({ ...s, type: SIGNAL_TYPES.USAGE })) || []),
        ...(data.outcomeSignals?.map(s => ({ ...s, type: SIGNAL_TYPES.OUTCOME })) || []),
        ...(data.creditSignals?.map(s => ({ ...s, type: SIGNAL_TYPES.CREDIT })) || []),
      ];
      
      const providedSignalIds = new Set(
        allProvidedSignals.filter(s => s.id).map(s => s.id)
      );
      
      // Delete signals that are no longer provided
      const signalsToDelete = currentSignals.filter(
        signal => !providedSignalIds.has(signal.id)
      );
      for (const signal of signalsToDelete) {
        await signalRepository.delete(signal.id);
      }
      
      // Update existing and create new signals
      for (const signal of allProvidedSignals) {
        if (signal.id) {
          // Update existing signal
          const updateData: any = {
            name: signal.name,
            slug: signal.slug,
          };
          
          if (signal.type === SIGNAL_TYPES.USAGE) {
            updateData.pricePerCallCents = signal.pricePerCallCents;
          } else if (signal.type === SIGNAL_TYPES.OUTCOME) {
            updateData.outcomePriceCents = signal.pricePerCallCents;
          } else if (signal.type === SIGNAL_TYPES.CREDIT) {
            updateData.creditsPerCallCents = signal.creditsPerCallCents;
          }
          
          await signalRepository.update(signal.id, updateData);
        } else {
          // Create new signal
          const createData: any = {
            name: signal.name,
            slug: signal.slug,
            agentId: data.agentId,
            signalType: signal.type,
            pricePerCallCents: 0,
          };
          
          if (signal.type === SIGNAL_TYPES.USAGE) {
            createData.pricePerCallCents = signal.pricePerCallCents;
          } else if (signal.type === SIGNAL_TYPES.OUTCOME) {
            createData.outcomePriceCents = signal.pricePerCallCents;
          } else if (signal.type === SIGNAL_TYPES.CREDIT) {
            createData.creditsPerCallCents = signal.creditsPerCallCents;
          }
          
          await signalRepository.create(createData);
        }
      }
    }

    return agentId;
  });

export const getAgents = createServerFn({ method: "GET" })
  .handler(async () => {
    return await agentRepository.findAll();
  });

export const deleteAgent = createServerFn({ method: "POST" })
  .validator(z.object({ agentId: z.string() }))
  .handler(async ({ data }) => {
    await agentRepository.delete(data.agentId);
  });
