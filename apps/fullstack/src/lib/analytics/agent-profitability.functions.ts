import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { calculatePeriodDays } from "~/lib/utils/date";
import { getAgentProfitability } from "./agent-profitability.service";

const profitabilitySchema = z.object({
  agentId: z.string().optional(),
  customerId: z.string().optional(),
  dateRange: z
    .object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    })
    .optional(),
});

export const getAgentProfitabilitySummary = createServerFn({ method: "GET" })
  .validator(profitabilitySchema)
  .handler(async ({ data }) => {
    const profitability = await getAgentProfitability(data);






    
    const periodDays = calculatePeriodDays(
      data.dateRange?.startDate,
      data.dateRange?.endDate
    );
    return { ...profitability, periodDays };
  });
