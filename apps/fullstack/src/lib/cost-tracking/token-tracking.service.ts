import type { NewTokenUsage } from "../database/schema";
import { llmModelsRepo } from "./llm-models.repo";
import { tokenUsageRepo } from "./token-usage.repo";

export interface TokenTrackingInput {
  customerId: string;
  agentId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  requestId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export class TokenTrackingService {
  async trackUsage(input: TokenTrackingInput): Promise<string> {
    // Find the model by provider and model name
    const provider = await llmModelsRepo.findByProviderName(input.provider);
    const model = provider.find((m) => m.modelName === input.model);

    if (!model) {
      throw new Error(
        `Model ${input.model} not found for provider ${input.provider}`
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
      requestId: input.requestId,
      sessionId: input.sessionId,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      totalTokens: input.inputTokens + input.outputTokens,
      inputCost: inputCost,
      outputCost: outputCost,
      totalCost: totalCost,
      metadata: input.metadata,
    };

    const created = await tokenUsageRepo.create(usage);
    return created.id;
  }

  async trackBatchUsage(inputs: TokenTrackingInput[]): Promise<string[]> {
    const usages: NewTokenUsage[] = [];

    for (const input of inputs) {
      const provider = await llmModelsRepo.findByProviderName(input.provider);
      const model = provider.find((m) => m.modelName === input.model);

      if (!model) {
        console.warn(
          `Model ${input.model} not found for provider ${input.provider}, skipping`
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
        requestId: input.requestId,
        sessionId: input.sessionId,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        totalTokens: input.inputTokens + input.outputTokens,
        inputCost: inputCost,
        outputCost: outputCost,
        totalCost: totalCost,
        metadata: input.metadata,
      });
    }

    const created = await tokenUsageRepo.createBatch(usages);
    return created.map((u) => u.id);
  }

}

export const tokenTrackingService = new TokenTrackingService();
