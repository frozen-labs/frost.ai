import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { tokenUsageRepo } from "./token-usage.repo";

const tokenUsageFiltersSchema = z.object({
  customerId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  modelId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const getTokenUsageSummary = createServerFn({ method: "GET" })
  .validator(tokenUsageFiltersSchema)
  .handler(async ({ data }) => {
    const filters = {
      customerId: data.customerId,
      agentId: data.agentId,
      modelId: data.modelId,
      sessionId: data.sessionId,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    };

    return await tokenUsageRepo.getTotalUsage(filters);
  });

export const getTokenUsageByModel = createServerFn({ method: "GET" })
  .validator(tokenUsageFiltersSchema)
  .handler(async ({ data }) => {
    const filters = {
      customerId: data.customerId,
      agentId: data.agentId,
      modelId: data.modelId,
      sessionId: data.sessionId,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    };

    return await tokenUsageRepo.getUsageByModel(filters);
  });

const tokenUsageWithRelationsSchema = tokenUsageFiltersSchema.extend({
  limit: z.number().min(1).max(1000).optional(),
});

export const getTokenUsageWithRelations = createServerFn({ method: "GET" })
  .validator(tokenUsageWithRelationsSchema)
  .handler(async ({ data }) => {
    const filters = {
      customerId: data.customerId,
      agentId: data.agentId,
      modelId: data.modelId,
      sessionId: data.sessionId,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    };

    return await tokenUsageRepo.findWithRelations(filters, data.limit);
  });
