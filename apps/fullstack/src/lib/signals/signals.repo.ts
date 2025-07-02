import { desc, eq } from "drizzle-orm";
import { AgentSignal, agentSignals, db, NewAgentSignal } from "~/lib/database";

export const signalRepository = {
  async create(data: NewAgentSignal): Promise<AgentSignal> {
    const [signal] = await db.insert(agentSignals).values(data).returning();
    return signal;
  },

  async createRange(data: NewAgentSignal[]): Promise<AgentSignal[]> {
    const createdSignals = await db
      .insert(agentSignals)
      .values(data)
      .returning();
    return createdSignals;
  },

  async findById(id: string): Promise<AgentSignal | null> {
    const [signal] = await db
      .select()
      .from(agentSignals)
      .where(eq(agentSignals.id, id))
      .limit(1);
    return signal || null;
  },

  async findAll(options?: {
    limit?: number;
    offset?: number;
  }): Promise<AgentSignal[]> {
    let query = db
      .select()
      .from(agentSignals)
      .orderBy(desc(agentSignals.createdAt))
      .$dynamic();

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.offset(options.offset);
    }

    return await query;
  },

  async findByAgentId(agentId: string): Promise<AgentSignal[]> {
    return await db
      .select()
      .from(agentSignals)
      .where(eq(agentSignals.agentId, agentId))
      .orderBy(desc(agentSignals.createdAt));
  },

  async findBySlug(slug: string): Promise<AgentSignal | null> {
    const [signal] = await db
      .select()
      .from(agentSignals)
      .where(eq(agentSignals.slug, slug))
      .limit(1);
    return signal || null;
  },

  async update(
    id: string,
    data: Partial<NewAgentSignal>
  ): Promise<AgentSignal | null> {
    const [signal] = await db
      .update(agentSignals)
      .set(data)
      .where(eq(agentSignals.id, id))
      .returning();
    return signal || null;
  },

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(agentSignals)
      .where(eq(agentSignals.id, id))
      .returning();
    return result.length > 0;
  },

  async deleteByAgentId(agentId: string): Promise<number> {
    const result = await db
      .delete(agentSignals)
      .where(eq(agentSignals.agentId, agentId))
      .returning();
    return result.length;
  },
};
