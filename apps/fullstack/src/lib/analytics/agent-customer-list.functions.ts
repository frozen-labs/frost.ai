import { createServerFn } from "@tanstack/react-start";
import { agentRepository } from "~/lib/agents/agents.repo";
import { customerRepository } from "~/lib/customers/customer.repo";

export const getAgentsList = createServerFn({ method: "GET" }).handler(async () => {
  const agents = await agentRepository.findAll();
  return agents.map(agent => ({
    id: agent.id,
    name: agent.name,
  }));
});

export const getCustomersList = createServerFn({ method: "GET" }).handler(async () => {
  const customers = await customerRepository.findAll();
  return customers.map(customer => ({
    id: customer.id,
    name: customer.name,
  }));
});