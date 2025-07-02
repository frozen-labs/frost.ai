import { and, count, eq, gte, lte, sum, SQL } from "drizzle-orm";
import { agentSignalLogs, agentSignals, db, tokenUsage } from "~/lib/database";

interface ProfitabilityParams {
  agentId?: string;
  customerId?: string;
  dateRange?: {
    startDate?: string;
    endDate?: string;
  };
}

interface ProfitabilityData {
  agentId?: string;
  revenue: number;
  costs: number;
  profit: number;
  profitMargin: number;
  signalCallCount: number;
  tokenUsageCount: number;
}

export async function getAgentProfitability(params: ProfitabilityParams): Promise<ProfitabilityData> {
  const { agentId, customerId, dateRange } = params;
  
  // Build conditions for both queries
  const signalConditions: SQL[] = [];
  const tokenConditions: SQL[] = [];

  // Agent filter
  if (agentId) {
    signalConditions.push(eq(agentSignals.agentId, agentId));
    tokenConditions.push(eq(tokenUsage.agentId, agentId));
  }

  // Customer filter
  if (customerId) {
    signalConditions.push(eq(agentSignalLogs.customerId, customerId));
    tokenConditions.push(eq(tokenUsage.customerId, customerId));
  }

  // Date range filters
  if (dateRange?.startDate) {
    const startDate = new Date(dateRange.startDate);
    signalConditions.push(gte(agentSignalLogs.createdAt, startDate));
    tokenConditions.push(gte(tokenUsage.createdAt, startDate));
  }
  if (dateRange?.endDate) {
    const endDate = new Date(dateRange.endDate);
    signalConditions.push(lte(agentSignalLogs.createdAt, endDate));
    tokenConditions.push(lte(tokenUsage.createdAt, endDate));
  }

  // Execute queries in parallel
  const [signalData, tokenData] = await Promise.all([
    db
      .select({
        totalRevenue: sum(agentSignals.pricePerCallCents),
        callCount: count(),
      })
      .from(agentSignalLogs)
      .leftJoin(agentSignals, eq(agentSignalLogs.agentSignalId, agentSignals.id))
      .where(signalConditions.length > 0 ? and(...signalConditions) : undefined),
    db
      .select({
        totalCost: sum(tokenUsage.totalCost),
        usageCount: count(),
      })
      .from(tokenUsage)
      .where(tokenConditions.length > 0 ? and(...tokenConditions) : undefined),
  ]);

  // Calculate metrics
  const revenue = Number(signalData[0]?.totalRevenue || 0);
  const costs = Number(tokenData[0]?.totalCost || 0);
  const profit = revenue - costs;
  const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return {
    ...(agentId && { agentId }),
    revenue,
    costs,
    profit,
    profitMargin,
    signalCallCount: Number(signalData[0]?.callCount || 0),
    tokenUsageCount: Number(tokenData[0]?.usageCount || 0),
  };
}

// Legacy function names for backward compatibility
export const getAllAgentsProfitability = getAgentProfitability;