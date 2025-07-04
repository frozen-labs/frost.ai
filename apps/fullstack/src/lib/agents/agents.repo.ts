import { eq } from "drizzle-orm";
import { Agent, agents, db, NewAgent } from "~/lib/database";

export const agentRepository = {
  async create(data: NewAgent): Promise<Agent> {
    const [agent] = await db.insert(agents).values(data).returning();
    return agent;
  },

  async findById(id: string): Promise<Agent | null> {
    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, id))
      .limit(1);
    return agent || null;
  },

  async findBySlug(slug: string): Promise<Agent | null> {
    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.slug, slug))
      .limit(1);
    return agent || null;
  },

  async findAll(): Promise<Agent[]> {
    return await db.select().from(agents);
  },

  async update(id: string, data: Partial<NewAgent>): Promise<Agent | null> {
    const [agent] = await db
      .update(agents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(agents.id, id))
      .returning();
    return agent || null;
  },

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(agents).where(eq(agents.id, id)).returning();
    return result.length > 0;
  },

  isRestrictedAgent(agent: Agent): boolean {
    return Boolean(agent.setupFeeEnabled) || Boolean(agent.platformFeeEnabled);
  },
};
