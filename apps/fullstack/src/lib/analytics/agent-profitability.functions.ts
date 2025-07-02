import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  getAgentProfitability,
  getAllAgentsProfitability,
} from "./agent-profitability.service";

export const getAgentProfitabilitySummary = createServerFn({ method: "GET" })
  .validator(
    z.object({
      agentId: z.string().optional(),
      customerId: z.string().optional(),
      dateRange: z
        .object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
        .optional(),
    })
  )
  .handler(async ({ data }) => {
    const profitability = data.agentId
      ? await getAgentProfitability({
          agentId: data.agentId,
          customerId: data.customerId,
          dateRange: data.dateRange,
        })
      : await getAllAgentsProfitability({
          customerId: data.customerId,
          dateRange: data.dateRange,
        });

    // Calculate period for comparison
    let periodDays = 7; // default
    if (data.dateRange?.startDate && data.dateRange?.endDate) {
      const start = new Date(data.dateRange.startDate);
      const end = new Date(data.dateRange.endDate);
      periodDays =
        Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
        1; // Add 1 to include both start and end dates
    }

    return {
      ...profitability,
      periodDays,
    };
  });
