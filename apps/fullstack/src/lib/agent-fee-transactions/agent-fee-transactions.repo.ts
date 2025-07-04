import { and, eq, gte, lte, sql } from "drizzle-orm";
import { agentFeeTransactions, db, NewAgentFeeTransaction, AgentFeeTransaction, FEE_TYPES, BILLING_CYCLES, type FeeType, type BillingCycle } from "~/lib/database/server";

export const agentFeeTransactionsRepository = {
  async create(data: NewAgentFeeTransaction): Promise<AgentFeeTransaction> {
    // For platform fees, calculate next billing date
    if (data.feeType === FEE_TYPES.PLATFORM && data.billingCycle) {
      const now = new Date();
      const anchorDay = data.billingAnchorDay || now.getDate();
      
      // Calculate next billing date based on cycle
      const nextDate = new Date(now);
      if (data.billingCycle === BILLING_CYCLES.MONTHLY) {
        nextDate.setMonth(nextDate.getMonth() + 1);
      } else if (data.billingCycle === BILLING_CYCLES.YEARLY) {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }
      
      // Set to anchor day, handling month-end edge cases
      const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
      nextDate.setDate(Math.min(anchorDay, lastDayOfMonth));
      
      // Set to noon to avoid DST issues
      nextDate.setHours(12, 0, 0, 0);
      
      data.nextBillingDate = nextDate;
      data.billingAnchorDay = anchorDay;
    }
    
    const [transaction] = await db.insert(agentFeeTransactions).values(data).returning();
    return transaction;
  },


  async findByCustomerAndAgent(customerId: string, agentId: string): Promise<AgentFeeTransaction[]> {
    return await db
      .select()
      .from(agentFeeTransactions)
      .where(and(
        eq(agentFeeTransactions.customerId, customerId),
        eq(agentFeeTransactions.agentId, agentId)
      ))
      .orderBy(sql`${agentFeeTransactions.transactionDate} DESC`);
  },

  async findByFeeType(customerId: string, agentId: string, feeType: FeeType): Promise<AgentFeeTransaction[]> {
    return await db
      .select()
      .from(agentFeeTransactions)
      .where(and(
        eq(agentFeeTransactions.customerId, customerId),
        eq(agentFeeTransactions.agentId, agentId),
        eq(agentFeeTransactions.feeType, feeType)
      ))
      .orderBy(sql`${agentFeeTransactions.transactionDate} DESC`);
  },



  // Check if platform fee should be charged for current period
  async shouldChargePlatformFee(
    customerId: string, 
    agentId: string, 
    billingCycle: BillingCycle
  ): Promise<boolean> {
    // Get the most recent ACTIVE platform fee transaction
    const [lastTransaction] = await db
      .select()
      .from(agentFeeTransactions)
      .where(and(
        eq(agentFeeTransactions.customerId, customerId),
        eq(agentFeeTransactions.agentId, agentId),
        eq(agentFeeTransactions.feeType, FEE_TYPES.PLATFORM),
        eq(agentFeeTransactions.billingCycle, billingCycle),
        eq(agentFeeTransactions.isActive, true)
      ))
      .orderBy(sql`${agentFeeTransactions.transactionDate} DESC`)
      .limit(1);
    
    // If no active transaction, fee should be charged
    if (!lastTransaction) {
      return true;
    }
    
    // If there's a next billing date, check if it's due
    if (lastTransaction.nextBillingDate) {
      return new Date() >= lastTransaction.nextBillingDate;
    }
    
    // Fallback: if no next billing date, charge the fee
    return true;
  },

  // Get total fees for customer/agent
  async getTotalFees(customerId: string, agentId?: string): Promise<number> {
    const conditions = [eq(agentFeeTransactions.customerId, customerId)];
    
    if (agentId) {
      conditions.push(eq(agentFeeTransactions.agentId, agentId));
    }

    const [result] = await db
      .select({ total: sql`COALESCE(SUM(${agentFeeTransactions.amountCents}), 0)` })
      .from(agentFeeTransactions)
      .where(and(...conditions));

    return Number(result.total) || 0;
  },
  
  // Get platform fee transactions due for renewal
  async getTransactionsDueForRenewal(): Promise<AgentFeeTransaction[]> {
    const now = new Date();
    return await db
      .select()
      .from(agentFeeTransactions)
      .where(and(
        eq(agentFeeTransactions.feeType, FEE_TYPES.PLATFORM),
        lte(agentFeeTransactions.nextBillingDate, now)
      ))
      .orderBy(agentFeeTransactions.nextBillingDate);
  },
  
  // Get last active platform fee transaction for linking
  async getLastPlatformFeeTransaction(
    customerId: string,
    agentId: string,
    billingCycle: BillingCycle
  ): Promise<AgentFeeTransaction | null> {
    const [transaction] = await db
      .select()
      .from(agentFeeTransactions)
      .where(and(
        eq(agentFeeTransactions.customerId, customerId),
        eq(agentFeeTransactions.agentId, agentId),
        eq(agentFeeTransactions.feeType, FEE_TYPES.PLATFORM),
        eq(agentFeeTransactions.billingCycle, billingCycle),
        eq(agentFeeTransactions.isActive, true)
      ))
      .orderBy(sql`${agentFeeTransactions.transactionDate} DESC`)
      .limit(1);
    return transaction || null;
  },
};