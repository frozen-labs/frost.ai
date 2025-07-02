import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { type NewValidModel } from "~/lib/database";
import { validModelsRepo } from "./valid-models.repo";

export const getModel = createServerFn({ method: "GET" })
  .validator(z.object({ modelId: z.string() }))
  .handler(async ({ data }) => {
    if (data.modelId === "new") {
      return null;
    }

    const model = await validModelsRepo.findById(data.modelId);
    if (!model) return null;

    return model;
  });

const saveModelSchema = z.object({
  modelId: z.string(),
  slug: z.string().min(1, "Model slug is required"),
  inputCostPer1MTokens: z.number().min(0, "Input cost must be positive"),
  outputCostPer1MTokens: z.number().min(0, "Output cost must be positive"),
});

export const saveModel = createServerFn({ method: "POST" })
  .validator(saveModelSchema)
  .handler(async ({ data }) => {
    const modelData: NewValidModel = {
      slug: data.slug,
      inputCostPer1MTokensCents: Math.round(data.inputCostPer1MTokens * 100),
      outputCostPer1MTokensCents: Math.round(data.outputCostPer1MTokens * 100),
    };

    let modelId = data.modelId;

    if (data.modelId === "new") {
      const newModel = await validModelsRepo.create(modelData);
      modelId = newModel.id;
    } else {
      await validModelsRepo.update(data.modelId, modelData);
    }

    return { modelId };
  });

export const getModels = createServerFn({ method: "GET" }).handler(async () => {
  const models = await validModelsRepo.findAll();
  return models;
});

export const deleteModel = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await validModelsRepo.delete(data.id);
    return { success: true };
  });
