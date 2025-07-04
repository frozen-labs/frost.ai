import { and, eq, sql } from "drizzle-orm";
import { customerCreditAllocations, db, NewCustomerCreditAllocation, CustomerCreditAllocation } from "~/lib/database/server";

export const creditAllocationsRepository = {
  async create(data: NewCustomerCreditAllocation): Promise<CustomerCreditAllocation> {
    const [allocation] = await db.insert(customerCreditAllocations).values(data).returning();
    return allocation;
  },

  async findById(id: string): Promise<CustomerCreditAllocation | null> {
    const [allocation] = await db
      .select()
      .from(customerCreditAllocations)
      .where(eq(customerCreditAllocations.id, id))
      .limit(1);
    return allocation || null;
  },

  async findByCustomerAgentSignal(
    customerId: string, 
    agentId: string, 
    signalId: string
  ): Promise<CustomerCreditAllocation | null> {
    const [allocation] = await db
      .select()
      .from(customerCreditAllocations)
      .where(and(
        eq(customerCreditAllocations.customerId, customerId),
        eq(customerCreditAllocations.agentId, agentId),
        eq(customerCreditAllocations.signalId, signalId)
      ))
      .limit(1);
    return allocation || null;
  },

  async findByCustomerId(customerId: string): Promise<CustomerCreditAllocation[]> {
    return await db
      .select()
      .from(customerCreditAllocations)
      .where(eq(customerCreditAllocations.customerId, customerId));
  },


  async updateCredits(id: string, creditsCents: number): Promise<CustomerCreditAllocation | null> {
    const [allocation] = await db
      .update(customerCreditAllocations)
      .set({ creditsCents, updatedAt: new Date() })
      .where(eq(customerCreditAllocations.id, id))
      .returning();
    return allocation || null;
  },


  // Atomic credit deduction for rate limiting - prevents race conditions
  async deductCredits(id: string, requiredCredits: number): Promise<CustomerCreditAllocation | null> {
    const [allocation] = await db
      .update(customerCreditAllocations)
      .set({ 
        creditsCents: sql`${customerCreditAllocations.creditsCents} - ${requiredCredits}`,
        updatedAt: new Date()
      })
      .where(and(
        eq(customerCreditAllocations.id, id),
        sql`${customerCreditAllocations.creditsCents} >= ${requiredCredits}`
      ))
      .returning();
    return allocation || null;
  },

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(customerCreditAllocations)
      .where(eq(customerCreditAllocations.id, id))
      .returning();
    return result.length > 0;
  },


  // Create or update allocation (upsert functionality)
  async upsert(data: NewCustomerCreditAllocation): Promise<CustomerCreditAllocation> {
    const existing = await this.findByCustomerAgentSignal(
      data.customerId, 
      data.agentId, 
      data.signalId
    );
    
    if (existing) {
      const updated = await this.updateCredits(existing.id, data.creditsCents || 0);
      return updated || existing;
    } else {
      return await this.create(data);
    }
  },
};