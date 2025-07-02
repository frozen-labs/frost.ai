import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAgentProfitability } from "./agent-profitability.service";
import { calculatePeriodDays } from "~/lib/utils/date";

const profitabilitySchema = z.object({
  agentId: z.string().optional(),
  customerId: z.string().optional(),
  dateRange: z
    .object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })
    .optional(),
});

export const getAgentProfitabilitySummary = createServerFn({ method: "GET" })
  .validator(profitabilitySchema)
  .handler(async ({ data }) => {
    const profitability = await getAgentProfitability(data);
    const periodDays = calculatePeriodDays(data.dateRange?.startDate, data.dateRange?.endDate);
    return { ...profitability, periodDays };
  });
