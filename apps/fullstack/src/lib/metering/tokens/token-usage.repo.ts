import { db } from "../../database/index";
import {
  tokenUsage,
  type NewTokenUsage,
  type TokenUsage,
} from "../../database/schema";

export const tokenUsageRepo = {
  async create(usage: NewTokenUsage): Promise<TokenUsage> {
    const results = await db.insert(tokenUsage).values(usage).returning();
    return results[0];
  },

  async createBatch(usages: NewTokenUsage[]): Promise<TokenUsage[]> {
    if (usages.length === 0) return [];
    return await db.insert(tokenUsage).values(usages).returning();
  },
};
