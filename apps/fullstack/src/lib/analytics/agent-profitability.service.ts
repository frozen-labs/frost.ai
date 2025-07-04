import { and, count, eq, gte, lte, sum, SQL } from "drizzle-orm";
import { agentSignalLogs, agentSignals, agentFeeTransactions, creditPurchases, db, tokenUsage } from "~/lib/database";

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
  signalRevenue: number;
  setupFeeRevenue: number;
  platformFeeRevenue: number;
  creditPurchaseRevenue: number;
  costs: number;
  profit: number;
  profitMargin: number;
  signalCallCount: number;
  tokenUsageCount: number;
}

export async function getAgentProfitability(params: ProfitabilityParams): Promise<ProfitabilityData> {
  const { agentId, customerId, dateRange } = params;
  
  // Build conditions for all queries
  const signalConditions: SQL[] = [];
  const tokenConditions: SQL[] = [];
  const feeConditions: SQL[] = [];
  const creditConditions: SQL[] = [];

  // Agent filter
  if (agentId) {
    signalConditions.push(eq(agentSignals.agentId, agentId));
    tokenConditions.push(eq(tokenUsage.agentId, agentId));
    feeConditions.push(eq(agentFeeTransactions.agentId, agentId));
    creditConditions.push(eq(creditPurchases.agentId, agentId));
  }

  // Customer filter
  if (customerId) {
    signalConditions.push(eq(agentSignalLogs.customerId, customerId));
    tokenConditions.push(eq(tokenUsage.customerId, customerId));
    feeConditions.push(eq(agentFeeTransactions.customerId, customerId));
    creditConditions.push(eq(creditPurchases.customerId, customerId));
  }

  // Date range filters
  if (dateRange?.startDate) {
    const startDate = new Date(dateRange.startDate);
    signalConditions.push(gte(agentSignalLogs.createdAt, startDate));
    tokenConditions.push(gte(tokenUsage.createdAt, startDate));
    feeConditions.push(gte(agentFeeTransactions.transactionDate, startDate));
    creditConditions.push(gte(creditPurchases.createdAt, startDate));
  }
  if (dateRange?.endDate) {
    const endDate = new Date(dateRange.endDate);
    signalConditions.push(lte(agentSignalLogs.createdAt, endDate));
    tokenConditions.push(lte(tokenUsage.createdAt, endDate));
    feeConditions.push(lte(agentFeeTransactions.transactionDate, endDate));
    creditConditions.push(lte(creditPurchases.createdAt, endDate));
  }

  // Execute queries in parallel
  const [signalData, tokenData, setupFeeData, platformFeeData, creditPurchaseData] = await Promise.all([
    db
      .select({
        totalRevenue: sum(agentSignalLogs.costCents),
        callCount: count(),
      })
      .from(agentSignalLogs)
      .leftJoin(agentSignals, eq(agentSignalLogs.agentSignalId, agentSignals.id))
      .where(signalConditions.length > 0 ? and(...signalConditions, eq(agentSignalLogs.costType, 'monetary')) : eq(agentSignalLogs.costType, 'monetary')),
    db
      .select({
        totalCost: sum(tokenUsage.totalCost),
        usageCount: count(),
      })
      .from(tokenUsage)
      .where(tokenConditions.length > 0 ? and(...tokenConditions) : undefined),
    db
      .select({
        setupFeeRevenue: sum(agentFeeTransactions.amountCents),
        setupFeeCount: count(),
      })
      .from(agentFeeTransactions)
      .where(feeConditions.length > 0 ? and(...feeConditions, eq(agentFeeTransactions.feeType, 'setup')) : eq(agentFeeTransactions.feeType, 'setup')),
    db
      .select({
        platformFeeRevenue: sum(agentFeeTransactions.amountCents),
        platformFeeCount: count(),
      })
      .from(agentFeeTransactions)
      .where(feeConditions.length > 0 ? and(...feeConditions, eq(agentFeeTransactions.feeType, 'platform')) : eq(agentFeeTransactions.feeType, 'platform')),
    db
      .select({
        creditPurchaseRevenue: sum(creditPurchases.pricePaidCents),
        creditPurchaseCount: count(),
      })
      .from(creditPurchases)
      .where(creditConditions.length > 0 ? and(...creditConditions) : undefined),
  ]);

  // Calculate metrics
  const signalRevenue = Number(signalData[0]?.totalRevenue || 0);
  const setupFeeRevenue = Number(setupFeeData[0]?.setupFeeRevenue || 0);
  const platformFeeRevenue = Number(platformFeeData[0]?.platformFeeRevenue || 0);
  const creditPurchaseRevenue = Number(creditPurchaseData[0]?.creditPurchaseRevenue || 0);
  const revenue = signalRevenue + setupFeeRevenue + platformFeeRevenue + creditPurchaseRevenue;
  const costs = Number(tokenData[0]?.totalCost || 0);
  const profit = revenue - costs;
  const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return {
    ...(agentId && { agentId }),
    revenue,
    signalRevenue,
    setupFeeRevenue,
    platformFeeRevenue,
    creditPurchaseRevenue,
    costs,
    profit,
    profitMargin,
    signalCallCount: Number(signalData[0]?.callCount || 0),
    tokenUsageCount: Number(tokenData[0]?.usageCount || 0),
  };
}

// Legacy function names for backward compatibility
export const getAllAgentsProfitability = getAgentProfitability;