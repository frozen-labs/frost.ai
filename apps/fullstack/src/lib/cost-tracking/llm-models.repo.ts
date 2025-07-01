import { and, eq } from "drizzle-orm";
import { db } from "../database/index";
import { llmModels, type LlmModel, type NewLlmModel } from "../database/schema";

export const llmModelsRepo = {
  async findAll(): Promise<LlmModel[]> {
    return await db.select().from(llmModels);
  },

  async findActive(): Promise<LlmModel[]> {
    return await db
      .select()
      .from(llmModels)
      .where(eq(llmModels.isActive, true));
  },

  async findWithProvider(): Promise<LlmModel[]> {
    return await db
      .select()
      .from(llmModels)
      .where(eq(llmModels.isActive, true));
  },

  async findById(id: string): Promise<LlmModel | undefined> {
    const results = await db
      .select()
      .from(llmModels)
      .where(eq(llmModels.id, id));
    return results[0];
  },

  async findByProviderAndModel(
    provider: string,
    modelName: string
  ): Promise<LlmModel | undefined> {
    const results = await db
      .select()
      .from(llmModels)
      .where(
        and(
          eq(llmModels.provider, provider),
          eq(llmModels.modelName, modelName)
        )
      );
    return results[0];
  },

  async findByProviderName(providerName: string): Promise<LlmModel[]> {
    return await db
      .select()
      .from(llmModels)
      .where(eq(llmModels.provider, providerName));
  },

  async create(model: NewLlmModel): Promise<LlmModel> {
    const results = await db.insert(llmModels).values(model).returning();
    return results[0];
  },

  async update(
    id: string,
    model: Partial<NewLlmModel>
  ): Promise<LlmModel | undefined> {
    const results = await db
      .update(llmModels)
      .set({ ...model, updatedAt: new Date() })
      .where(eq(llmModels.id, id))
      .returning();
    return results[0];
  },

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(llmModels).where(eq(llmModels.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  },
};
