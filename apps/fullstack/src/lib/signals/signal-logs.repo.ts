import { desc, eq } from "drizzle-orm";
import { AgentSignalLog, agentSignalLogs, db, NewAgentSignalLog } from "~/lib/database";

export const signalLogRepository = {
  async create(data: NewAgentSignalLog): Promise<AgentSignalLog> {
    const [signalLog] = await db.insert(agentSignalLogs).values(data).returning();
    return signalLog;
  },

  async findById(id: string): Promise<AgentSignalLog | null> {
    const [signalLog] = await db
      .select()
      .from(agentSignalLogs)
      .where(eq(agentSignalLogs.id, id))
      .limit(1);
    return signalLog || null;
  },

  async findBySignalId(agentSignalId: string): Promise<AgentSignalLog[]> {
    return await db
      .select()
      .from(agentSignalLogs)
      .where(eq(agentSignalLogs.agentSignalId, agentSignalId))
      .orderBy(desc(agentSignalLogs.createdAt));
  },

  async findByCustomerId(customerId: string): Promise<AgentSignalLog[]> {
    return await db
      .select()
      .from(agentSignalLogs)
      .where(eq(agentSignalLogs.customerId, customerId))
      .orderBy(desc(agentSignalLogs.createdAt));
  },
};