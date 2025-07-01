import { and, between, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "../database/index";
import {
  agents,
  customers,
  llmModels,
  tokenUsage,
  type NewTokenUsage,
  type TokenUsage,
} from "../database/schema";

export interface TokenUsageWithRelations extends TokenUsage {
  customer: { id: string; name: string };
  agent: { id: string; name: string };
  model: {
    id: string;
    modelName: string;
    displayName: string;
    provider: string;
  };
}

export interface TokenUsageFilters {
  customerId?: string;
  agentId?: string;
  modelId?: string;
  sessionId?: string;
  startDate?: Date;
  endDate?: Date;
}

export const tokenUsageRepo = {
  async create(usage: NewTokenUsage): Promise<TokenUsage> {
    const results = await db.insert(tokenUsage).values(usage).returning();
    return results[0];
  },

  async createBatch(usages: NewTokenUsage[]): Promise<TokenUsage[]> {
    if (usages.length === 0) return [];
    return await db.insert(tokenUsage).values(usages).returning();
  },

  async findById(id: string): Promise<TokenUsage | undefined> {
    const results = await db
      .select()
      .from(tokenUsage)
      .where(eq(tokenUsage.id, id));
    return results[0];
  },

  async findWithRelations(
    filters: TokenUsageFilters,
    limit = 100
  ): Promise<TokenUsageWithRelations[]> {
    let query = db
      .select({
        id: tokenUsage.id,
        customerId: tokenUsage.customerId,
        agentId: tokenUsage.agentId,
        modelId: tokenUsage.modelId,
        requestId: tokenUsage.requestId,
        sessionId: tokenUsage.sessionId,
        inputTokens: tokenUsage.inputTokens,
        outputTokens: tokenUsage.outputTokens,
        totalTokens: tokenUsage.totalTokens,
        inputCost: tokenUsage.inputCost,
        outputCost: tokenUsage.outputCost,
        totalCost: tokenUsage.totalCost,
        metadata: tokenUsage.metadata,
        createdAt: tokenUsage.createdAt,
        customer: {
          id: customers.id,
          name: customers.name,
        },
        agent: {
          id: agents.id,
          name: agents.name,
        },
        model: {
          id: llmModels.id,
          modelName: llmModels.modelName,
          displayName: llmModels.displayName,
          provider: llmModels.provider,
        },
      })
      .from(tokenUsage)
      .innerJoin(customers, eq(tokenUsage.customerId, customers.id))
      .innerJoin(agents, eq(tokenUsage.agentId, agents.id))
      .innerJoin(llmModels, eq(tokenUsage.modelId, llmModels.id))
      .orderBy(desc(tokenUsage.createdAt))
      .limit(limit);

    const conditions = [];
    if (filters.customerId)
      conditions.push(eq(tokenUsage.customerId, filters.customerId));
    if (filters.agentId)
      conditions.push(eq(tokenUsage.agentId, filters.agentId));
    if (filters.modelId)
      conditions.push(eq(tokenUsage.modelId, filters.modelId));
    if (filters.sessionId)
      conditions.push(eq(tokenUsage.sessionId, filters.sessionId));
    if (filters.startDate && filters.endDate) {
      conditions.push(
        between(tokenUsage.createdAt, filters.startDate, filters.endDate)
      );
    } else if (filters.startDate) {
      conditions.push(gte(tokenUsage.createdAt, filters.startDate));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query;
  },

  async getTotalUsage(filters: TokenUsageFilters): Promise<{
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    totalCost: number;
    requestCount: number;
  }> {
    let query = db
      .select({
        totalInputTokens: sql<number>`COALESCE(SUM(${tokenUsage.inputTokens}), 0)`,
        totalOutputTokens: sql<number>`COALESCE(SUM(${tokenUsage.outputTokens}), 0)`,
        totalTokens: sql<number>`COALESCE(SUM(${tokenUsage.totalTokens}), 0)`,
        totalCost: sql<number>`COALESCE(SUM(${tokenUsage.totalCost}), 0)`,
        requestCount: sql<number>`COUNT(*)`,
      })
      .from(tokenUsage);

    const conditions = [];
    if (filters.customerId)
      conditions.push(eq(tokenUsage.customerId, filters.customerId));
    if (filters.agentId)
      conditions.push(eq(tokenUsage.agentId, filters.agentId));
    if (filters.modelId)
      conditions.push(eq(tokenUsage.modelId, filters.modelId));
    if (filters.sessionId)
      conditions.push(eq(tokenUsage.sessionId, filters.sessionId));
    if (filters.startDate && filters.endDate) {
      conditions.push(
        between(tokenUsage.createdAt, filters.startDate, filters.endDate)
      );
    } else if (filters.startDate) {
      conditions.push(gte(tokenUsage.createdAt, filters.startDate));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query;
    return results[0];
  },

  async getUsageByModel(filters: TokenUsageFilters): Promise<
    Array<{
      modelId: string;
      modelName: string;
      providerName: string;
      totalInputTokens: number;
      totalOutputTokens: number;
      totalTokens: number;
      totalCost: number;
      requestCount: number;
    }>
  > {
    let query = db
      .select({
        modelId: tokenUsage.modelId,
        modelName: llmModels.modelName,
        providerName: llmModels.provider,
        totalInputTokens: sql<number>`COALESCE(SUM(${tokenUsage.inputTokens}), 0)`,
        totalOutputTokens: sql<number>`COALESCE(SUM(${tokenUsage.outputTokens}), 0)`,
        totalTokens: sql<number>`COALESCE(SUM(${tokenUsage.totalTokens}), 0)`,
        totalCost: sql<number>`COALESCE(SUM(${tokenUsage.totalCost}), 0)`,
        requestCount: sql<number>`COUNT(*)`,
      })
      .from(tokenUsage)
      .innerJoin(llmModels, eq(tokenUsage.modelId, llmModels.id))
      .groupBy(tokenUsage.modelId, llmModels.modelName, llmModels.provider);

    const conditions = [];
    if (filters.customerId)
      conditions.push(eq(tokenUsage.customerId, filters.customerId));
    if (filters.agentId)
      conditions.push(eq(tokenUsage.agentId, filters.agentId));
    if (filters.startDate && filters.endDate) {
      conditions.push(
        between(tokenUsage.createdAt, filters.startDate, filters.endDate)
      );
    } else if (filters.startDate) {
      conditions.push(gte(tokenUsage.createdAt, filters.startDate));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query;
  },

  async deleteByCustomerId(customerId: string): Promise<number> {
    const result = await db
      .delete(tokenUsage)
      .where(eq(tokenUsage.customerId, customerId));
    return result.count;
  },

};
