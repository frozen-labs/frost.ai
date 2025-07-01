import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { UsageDashboard } from "./_components";

const searchSchema = z.object({
  customerId: z.string().optional(),
  agentId: z.string().optional(),
});

export const Route = createFileRoute("/analytics/token-usage/")({
  validateSearch: searchSchema,
  component: TokenUsagePage,
});

function TokenUsagePage() {
  const { customerId, agentId } = Route.useSearch();

  return (
    <div className="container mx-auto py-8">
      <UsageDashboard customerId={customerId} agentId={agentId} />
    </div>
  );
}
