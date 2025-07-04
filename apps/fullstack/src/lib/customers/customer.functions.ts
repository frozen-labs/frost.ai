import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { type NewCustomer, SIGNAL_TYPES, FEE_TYPES, BILLING_CYCLES } from "~/lib/database";

export const getCustomer = createServerFn({ method: "GET" })
  .validator(z.object({ customerId: z.string() }))
  .handler(async ({ data }) => {
    if (data.customerId === "new") {
      return null;
    }

    const { customerRepository } = await import("./customer.repo");
    const { agentRepository } = await import("~/lib/agents/agents.repo");
    const { signalRepository } = await import("~/lib/signals/signals.repo");
    const { customerAgentLinksRepository } = await import("~/lib/customer-agent-links/customer-agent-links.repo");
    const { creditAllocationsRepository } = await import("~/lib/credit-allocations/credit-allocations.repo");

    const customer = await customerRepository.findById(data.customerId);
    if (!customer) return null;

    // Get credit allocations for this customer
    const allocations = await creditAllocationsRepository.findByCustomerId(customer.id);
    const creditAllocations = await Promise.all(
      allocations.map(async (alloc) => {
        const agent = await agentRepository.findById(alloc.agentId);
        const signal = await signalRepository.findById(alloc.signalId);
        return {
          id: alloc.id,
          agentId: alloc.agentId,
          agentName: agent?.name || '',
          signalId: alloc.signalId,
          signalName: signal?.name || '',
          creditsCents: alloc.creditsCents,
        };
      })
    );

    // Get linked agent IDs
    const links = await customerAgentLinksRepository.findByCustomerId(customer.id);
    const linkedAgentIds = links.map(link => link.agentId);

    return {
      ...customer,
      creditAllocations,
      linkedAgentIds,
    };
  });

const saveCustomerSchema = z.object({
  customerId: z.string(),
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
});

export const saveCustomer = createServerFn({ method: "POST" })
  .validator(saveCustomerSchema)
  .handler(async ({ data }) => {
    const { customerRepository } = await import("./customer.repo");

    const customerData: NewCustomer = {
      name: data.name,
      slug: data.slug,
    };

    if (data.customerId === "new") {
      await customerRepository.create(customerData);
    } else {
      await customerRepository.update(data.customerId, customerData);
    }
  });

export const getAllAgents = createServerFn({ method: "GET" })
  .handler(async () => {
    const { agentRepository } = await import("~/lib/agents/agents.repo");
    const agents = await agentRepository.findAll();
    return agents;
  });

export const getCreditSignals = createServerFn({ method: "GET" })
  .handler(async () => {
    const { agentRepository } = await import("~/lib/agents/agents.repo");
    const { signalRepository } = await import("~/lib/signals/signals.repo");

    const agents = await agentRepository.findAll();
    const agentsWithCreditSignals = await Promise.all(
      agents.map(async (agent) => {
        const signals = await signalRepository.findByAgentId(agent.id);
        const creditSignals = signals.filter(s => s.signalType === SIGNAL_TYPES.CREDIT);
        return {
          agentId: agent.id,
          agentName: agent.name,
          creditSignals: creditSignals.map(signal => ({
            id: signal.id,
            name: signal.name,
            slug: signal.slug,
            creditsPerCallCents: signal.creditsPerCallCents || 0,
          })),
        };
      })
    );
    return agentsWithCreditSignals.filter(a => a.creditSignals.length > 0);
  });

export const linkAgentToCustomer = createServerFn({ method: "POST" })
  .validator(z.object({
    customerId: z.string(),
    agentId: z.string(),
  }))
  .handler(async ({ data }) => {
    const { customerAgentLinksRepository } = await import("~/lib/customer-agent-links/customer-agent-links.repo");
    await customerAgentLinksRepository.create({
      customerId: data.customerId,
      agentId: data.agentId,
    });
  });

export const unlinkAgentFromCustomer = createServerFn({ method: "POST" })
  .validator(z.object({
    customerId: z.string(),
    agentId: z.string(),
  }))
  .handler(async ({ data }) => {
    const { customerAgentLinksRepository } = await import("~/lib/customer-agent-links/customer-agent-links.repo");
    await customerAgentLinksRepository.delete(
      data.customerId,
      data.agentId
    );
  });

export const linkAgentWithFees = createServerFn({ method: "POST" })
  .validator(z.object({
    customerId: z.string(),
    agentId: z.string(),
  }))
  .handler(async ({ data }) => {
    const { agentRepository } = await import("~/lib/agents/agents.repo");
    const { customerAgentLinksRepository } = await import("~/lib/customer-agent-links/customer-agent-links.repo");
    const { agentFeeTransactionsRepository } = await import("~/lib/agent-fee-transactions/agent-fee-transactions.repo");

    const agent = await agentRepository.findById(data.agentId);
    if (!agent) throw new Error("Agent not found");

    // Create link
    await customerAgentLinksRepository.create({
      customerId: data.customerId,
      agentId: data.agentId,
    });

    const feesApplied = {
      setupFee: 0,
      platformFee: 0,
    };

    // Charge setup fee if enabled
    if (agent.setupFeeEnabled && agent.setupFeeCents) {
      await agentFeeTransactionsRepository.create({
        customerId: data.customerId,
        agentId: data.agentId,
        feeType: FEE_TYPES.SETUP,
        amountCents: agent.setupFeeCents,
        billingTimezone: 'UTC',
      });
      feesApplied.setupFee = agent.setupFeeCents / 100;
    }

    // Charge platform fee if enabled
    if (agent.platformFeeEnabled && agent.platformFeeCents && agent.platformFeeBillingCycle) {
      await agentFeeTransactionsRepository.create({
        customerId: data.customerId,
        agentId: data.agentId,
        feeType: FEE_TYPES.PLATFORM,
        amountCents: agent.platformFeeCents,
        billingCycle: agent.platformFeeBillingCycle,
        billingTimezone: 'UTC',
      });
      feesApplied.platformFee = agent.platformFeeCents / 100;
    }
    
    return { feesApplied };
  });

export const createCreditAllocation = createServerFn({ method: "POST" })
  .validator(z.object({
    customerId: z.string(),
    agentId: z.string(),
    signalId: z.string(),
    creditsCents: z.number(),
  }))
  .handler(async ({ data }) => {
    const { creditAllocationsRepository } = await import("~/lib/credit-allocations/credit-allocations.repo");
    await creditAllocationsRepository.create({
      customerId: data.customerId,
      agentId: data.agentId,
      signalId: data.signalId,
      creditsCents: data.creditsCents,
    });
  });

export const updateCreditAllocation = createServerFn({ method: "POST" })
  .validator(z.object({
    allocationId: z.string(),
    creditsCents: z.number(),
  }))
  .handler(async ({ data }) => {
    const { creditAllocationsRepository } = await import("~/lib/credit-allocations/credit-allocations.repo");
    await creditAllocationsRepository.updateCredits(data.allocationId, data.creditsCents);
  });

export const removeCreditAllocation = createServerFn({ method: "POST" })
  .validator(z.object({
    allocationId: z.string(),
  }))
  .handler(async ({ data }) => {
    const { creditAllocationsRepository } = await import("~/lib/credit-allocations/credit-allocations.repo");
    await creditAllocationsRepository.delete(data.allocationId);
  });

export const getCustomers = createServerFn({ method: "GET" })
  .handler(async () => {
    const { customerRepository } = await import("./customer.repo");
    const customers = await customerRepository.findAll();
    return customers.map(customer => ({
      ...customer,
      description: (customer.metadata as any)?.description || ''
    }));
  });

export const deleteCustomer = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const { customerRepository } = await import("./customer.repo");
    await customerRepository.delete(data.id);
    return { success: true };
  });
