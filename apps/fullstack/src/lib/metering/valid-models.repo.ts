import { eq } from "drizzle-orm";
import { db } from "../database/index";
import { validModels, type ValidModel, type NewValidModel } from "../database/schema";

export const validModelsRepo = {
  async findAll(): Promise<ValidModel[]> {
    return await db.select().from(validModels);
  },

  async findActive(): Promise<ValidModel[]> {
    return await db
      .select()
      .from(validModels)
      .where(eq(validModels.isActive, true));
  },

  async findById(id: string): Promise<ValidModel | undefined> {
    const results = await db
      .select()
      .from(validModels)
      .where(eq(validModels.id, id));
    return results[0];
  },

  async findByModelIdentifier(modelIdentifier: string): Promise<ValidModel | undefined> {
    const results = await db
      .select()
      .from(validModels)
      .where(eq(validModels.modelIdentifier, modelIdentifier));
    return results[0];
  },

  async create(model: NewValidModel): Promise<ValidModel> {
    const results = await db.insert(validModels).values(model).returning();
    return results[0];
  },

  async update(
    id: string,
    model: Partial<NewValidModel>
  ): Promise<ValidModel | undefined> {
    const results = await db
      .update(validModels)
      .set({ ...model, updatedAt: new Date() })
      .where(eq(validModels.id, id))
      .returning();
    return results[0];
  },

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(validModels).where(eq(validModels.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  },
};