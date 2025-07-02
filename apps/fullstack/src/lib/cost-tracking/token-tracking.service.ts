import type { NewTokenUsage } from "../database/schema";
import { validModelsRepo } from "./valid-models.repo";
import { tokenUsageRepo } from "./token-usage.repo";

export interface TokenTrackingInput {
  customerId: string;
  agentId: string;
  modelIdentifier: string;
  inputTokens: number;
  outputTokens: number;
}

export class TokenTrackingService {
  async trackUsage(input: TokenTrackingInput): Promise<string> {
    // Find the model by identifier
    const model = await validModelsRepo.findByModelIdentifier(input.modelIdentifier);

    if (!model) {
      throw new Error(
        `Model with identifier ${input.modelIdentifier} not found`
      );
    }

    // Calculate costs in cents
    const inputCostPer1k = parseFloat(model.inputCostPer1kTokens);
    const outputCostPer1k = parseFloat(model.outputCostPer1kTokens);

    const inputCost = Math.round(((input.inputTokens / 1000) * inputCostPer1k) * 100);
    const outputCost = Math.round(((input.outputTokens / 1000) * outputCostPer1k) * 100);
    const totalCost = inputCost + outputCost;

    // Create the usage record
    const usage: NewTokenUsage = {
      customerId: input.customerId,
      agentId: input.agentId,
      modelId: model.id,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      totalTokens: input.inputTokens + input.outputTokens,
      inputCost: inputCost,
      outputCost: outputCost,
      totalCost: totalCost,
    };

    const created = await tokenUsageRepo.create(usage);
    return created.id;
  }

  async trackBatchUsage(inputs: TokenTrackingInput[]): Promise<string[]> {
    const usages: NewTokenUsage[] = [];

    for (const input of inputs) {
      const model = await validModelsRepo.findByModelIdentifier(input.modelIdentifier);

      if (!model) {
        console.warn(
          `Model with identifier ${input.modelIdentifier} not found, skipping`
        );
        continue;
      }

      const inputCostPer1k = parseFloat(model.inputCostPer1kTokens);
      const outputCostPer1k = parseFloat(model.outputCostPer1kTokens);

      const inputCost = Math.round(((input.inputTokens / 1000) * inputCostPer1k) * 100);
      const outputCost = Math.round(((input.outputTokens / 1000) * outputCostPer1k) * 100);
      const totalCost = inputCost + outputCost;

      usages.push({
        customerId: input.customerId,
        agentId: input.agentId,
        modelId: model.id,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        totalTokens: input.inputTokens + input.outputTokens,
        inputCost: inputCost,
        outputCost: outputCost,
        totalCost: totalCost,
      });
    }

    const created = await tokenUsageRepo.createBatch(usages);
    return created.map((u) => u.id);
  }

}

export const tokenTrackingService = new TokenTrackingService();
