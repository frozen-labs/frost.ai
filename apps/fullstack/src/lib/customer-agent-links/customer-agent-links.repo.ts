import { and, eq } from "drizzle-orm";
import { customerAgentLinks, db, NewCustomerAgentLink, CustomerAgentLink } from "~/lib/database/server";

export const customerAgentLinksRepository = {
  async create(data: NewCustomerAgentLink): Promise<CustomerAgentLink> {
    const [link] = await db.insert(customerAgentLinks).values(data).returning();
    return link;
  },

  async findByCustomerAndAgent(customerId: string, agentId: string): Promise<CustomerAgentLink | null> {
    const [link] = await db
      .select()
      .from(customerAgentLinks)
      .where(and(
        eq(customerAgentLinks.customerId, customerId),
        eq(customerAgentLinks.agentId, agentId)
      ))
      .limit(1);
    return link || null;
  },

  async findByCustomerId(customerId: string): Promise<CustomerAgentLink[]> {
    return await db
      .select()
      .from(customerAgentLinks)
      .where(eq(customerAgentLinks.customerId, customerId));
  },


  async delete(customerId: string, agentId: string): Promise<boolean> {
    const result = await db
      .delete(customerAgentLinks)
      .where(and(
        eq(customerAgentLinks.customerId, customerId),
        eq(customerAgentLinks.agentId, agentId)
      ))
      .returning();
    return result.length > 0;
  },

  // Validation helper for restricted agent access
  async hasAccess(customerId: string, agentId: string): Promise<boolean> {
    const link = await this.findByCustomerAndAgent(customerId, agentId);
    return link !== null;
  },
};