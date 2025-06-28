import { and, eq, gte, lte, sql, desc } from "drizzle-orm";
import { 
  agents,
  agentSignals, 
  agentSignalLogs,
  customers,
  db
} from "~/lib/database";

export const analyticsRepository = {
  // Get analytics data for a specific customer within date range
  async getCustomerAnalytics(customerId: string, startDate: Date, endDate: Date): Promise<Array<{
    signalId: string;
    signalName: string;
    pricePerCallCents: number;
    callCount: number;
    totalCost: number;
  }>> {
    const result = await db
      .select({
        signalId: agentSignals.friendlySignalIdentifier,
        signalName: agentSignals.name,
        pricePerCallCents: agentSignals.pricePerCallCents,
        callCount: sql<number>`COUNT(${agentSignalLogs.id})`,
        totalCost: sql<number>`COUNT(${agentSignalLogs.id}) * ${agentSignals.pricePerCallCents}`,
      })
      .from(agentSignalLogs)
      .innerJoin(agentSignals, eq(agentSignals.id, agentSignalLogs.agentSignalId))
      .where(
        and(
          eq(agentSignalLogs.customerId, customerId),
          gte(agentSignalLogs.createdAt, startDate),
          lte(agentSignalLogs.createdAt, endDate)
        )
      )
      .groupBy(agentSignals.id, agentSignals.friendlySignalIdentifier, agentSignals.name, agentSignals.pricePerCallCents)
      .orderBy(desc(sql<number>`COUNT(${agentSignalLogs.id})`));
    
    return result.map(row => ({
      signalId: row.signalId,
      signalName: row.signalName,
      pricePerCallCents: row.pricePerCallCents,
      callCount: Number(row.callCount),
      totalCost: Number(row.totalCost),
    }));
  },

  // Get payment summary for a customer within date range
  async getCustomerPaymentSummary(customerId: string, startDate: Date, endDate: Date): Promise<{
    totalCalls: number;
    totalAmount: number;
    uniqueSignals: number;
  }> {
    const result = await db
      .select({
        totalCalls: sql<number>`COUNT(${agentSignalLogs.id})`,
        totalAmount: sql<number>`SUM(${agentSignals.pricePerCallCents})`,
        uniqueSignals: sql<number>`COUNT(DISTINCT ${agentSignals.id})`,
      })
      .from(agentSignalLogs)
      .innerJoin(agentSignals, eq(agentSignals.id, agentSignalLogs.agentSignalId))
      .where(
        and(
          eq(agentSignalLogs.customerId, customerId),
          gte(agentSignalLogs.createdAt, startDate),
          lte(agentSignalLogs.createdAt, endDate)
        )
      );
    
    const row = result[0];
    return {
      totalCalls: Number(row?.totalCalls || 0),
      totalAmount: Number(row?.totalAmount || 0),
      uniqueSignals: Number(row?.uniqueSignals || 0),
    };
  },

  // Get recent signal calls for a customer with pagination and search
  async getRecentSignalCalls(
    customerId: string, 
    options: {
      limit?: number;
      offset?: number;
      search?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{
    calls: Array<{
      id: string;
      signalName: string;
      signalId: string;
      agentName: string;
      pricePerCallCents: number;
      timestamp: Date;
      metadata: Record<string, any> | null;
    }>;
    total: number;
  }> {
    const { limit = 10, offset = 0, search, startDate, endDate } = options;
    
    let whereConditions = [eq(agentSignalLogs.customerId, customerId)];
    
    if (search && search.trim()) {
      const searchPattern = `%${search.trim().toLowerCase()}%`;
      whereConditions.push(
        sql`(LOWER(${agentSignals.name}) LIKE ${searchPattern} OR LOWER(${agents.name}) LIKE ${searchPattern})`
      );
    }
    
    if (startDate) {
      whereConditions.push(gte(agentSignalLogs.createdAt, startDate));
    }
    
    if (endDate) {
      whereConditions.push(lte(agentSignalLogs.createdAt, endDate));
    }
    
    const [callsResult, countResult] = await Promise.all([
      db
        .select({
          id: agentSignalLogs.id,
          signalName: agentSignals.name,
          signalId: agentSignals.friendlySignalIdentifier,
          agentName: agents.name,
          pricePerCallCents: agentSignals.pricePerCallCents,
          timestamp: agentSignalLogs.createdAt,
          metadata: agentSignalLogs.metadata,
        })
        .from(agentSignalLogs)
        .innerJoin(agentSignals, eq(agentSignals.id, agentSignalLogs.agentSignalId))
        .innerJoin(agents, eq(agents.id, agentSignals.agentId))
        .where(and(...whereConditions))
        .orderBy(desc(agentSignalLogs.createdAt))
        .limit(limit)
        .offset(offset),
      
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(agentSignalLogs)
        .innerJoin(agentSignals, eq(agentSignals.id, agentSignalLogs.agentSignalId))
        .innerJoin(agents, eq(agents.id, agentSignals.agentId))
        .where(and(...whereConditions))
    ]);
    
    return {
      calls: callsResult,
      total: Number(countResult[0]?.count || 0),
    };
  },

  // Get agent summary for a customer
  async getCustomerAgentSummary(customerId: string, startDate: Date, endDate: Date): Promise<{
    agentCount: number;
    agents: Array<{
      agentId: string;
      agentName: string;
      signalCount: number;
    }>;
  }> {
    const result = await db
      .select({
        agentId: agents.id,
        agentName: agents.name,
        signalCount: sql<number>`COUNT(DISTINCT ${agentSignals.id})`,
      })
      .from(agentSignalLogs)
      .innerJoin(agentSignals, eq(agentSignals.id, agentSignalLogs.agentSignalId))
      .innerJoin(agents, eq(agents.id, agentSignals.agentId))
      .where(
        and(
          eq(agentSignalLogs.customerId, customerId),
          gte(agentSignalLogs.createdAt, startDate),
          lte(agentSignalLogs.createdAt, endDate)
        )
      )
      .groupBy(agents.id, agents.name)
      .orderBy(desc(sql<number>`COUNT(DISTINCT ${agentSignals.id})`));
    
    return {
      agentCount: result.length,
      agents: result.map(row => ({
        agentId: row.agentId,
        agentName: row.agentName,
        signalCount: Number(row.signalCount),
      })),
    };
  },

  // Get all customers for the dropdown
  async getAllCustomers(): Promise<Array<{
    id: string;
    name: string;
  }>> {
    const result = await db
      .select({
        id: customers.id,
        name: customers.name,
      })
      .from(customers)
      .orderBy(customers.name);
    
    return result;
  },
};