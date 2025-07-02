import { createServerFn } from "@tanstack/start";
import { and, count, eq, gte, lte, sum } from "drizzle-orm";
import { z } from "zod";
import { agentSignalLogs, agentSignals, db, tokenUsage } from "~/lib/database";

interface DateRange {
  startDate?: string;
  endDate?: string;
}

interface AgentProfitabilityData {
  agentId: string;
  revenue: number;
  costs: number;
  profit: number;
  profitMargin: number;
  signalCallCount: number;
  tokenUsageCount: number;
}

export async function getAgentProfitability({
  agentId,
  customerId,
  dateRange,
}: {
  agentId: string;
  customerId?: string;
  dateRange?: DateRange;
}): Promise<AgentProfitabilityData> {
  const conditions = [];
  const tokenConditions = [];

  // Base condition for agent through signal join
  conditions.push(eq(agentSignals.agentId, agentId));
  tokenConditions.push(eq(tokenUsage.agentId, agentId));

  // Optional customer filter
  if (customerId) {
    conditions.push(eq(agentSignalLogs.customerId, customerId));
    tokenConditions.push(eq(tokenUsage.customerId, customerId));
  }

  // Optional date range filter
  if (dateRange?.startDate) {
    conditions.push(
      gte(agentSignalLogs.createdAt, new Date(dateRange.startDate))
    );
    tokenConditions.push(
      gte(tokenUsage.createdAt, new Date(dateRange.startDate))
    );
  }
  if (dateRange?.endDate) {
    conditions.push(
      lte(agentSignalLogs.createdAt, new Date(dateRange.endDate))
    );
    tokenConditions.push(
      lte(tokenUsage.createdAt, new Date(dateRange.endDate))
    );
  }

  // Calculate revenue from signal calls
  const signalRevenue = await db
    .select({
      totalRevenue: sum(agentSignals.pricePerCallCents),
      callCount: count(),
    })
    .from(agentSignalLogs)
    .leftJoin(agentSignals, eq(agentSignalLogs.agentSignalId, agentSignals.id))
    .where(and(...conditions));

  // Calculate costs from token usage
  const tokenCosts = await db
    .select({
      totalCost: sum(tokenUsage.totalCost),
      usageCount: count(),
    })
    .from(tokenUsage)
    .where(and(...tokenConditions));

  const revenue = Number(signalRevenue[0]?.totalRevenue || 0);
  const costs = Number(tokenCosts[0]?.totalCost || 0);
  const profit = revenue - costs;
  const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return {
    agentId,
    revenue,
    costs,
    profit,
    profitMargin,
    signalCallCount: Number(signalRevenue[0]?.callCount || 0),
    tokenUsageCount: Number(tokenCosts[0]?.usageCount || 0),
  };
}

export const getAgentProfitabilitySummary = createServerFn({ method: "GET" })
  .validator(
    z.object({
      agentId: z.string(),
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
    const profitability = await getAgentProfitability({
      agentId: data.agentId,
      customerId: data.customerId,
      dateRange: data.dateRange,
    });

    // Calculate period for comparison
    let periodDays = 7; // default
    if (data.dateRange?.startDate && data.dateRange?.endDate) {
      const start = new Date(data.dateRange.startDate);
      const end = new Date(data.dateRange.endDate);
      periodDays = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    // Calculate daily averages
    const dailyRevenue = profitability.revenue / periodDays;
    const dailyCosts = profitability.costs / periodDays;
    const dailyProfit = profitability.profit / periodDays;

    return {
      ...profitability,
      periodDays,
      dailyRevenue,
      dailyCosts,
      dailyProfit,
    };
  });
