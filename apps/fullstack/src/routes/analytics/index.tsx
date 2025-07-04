import { createFileRoute } from "@tanstack/react-router";
import { AgentProfitabilityDashboard } from "./-components/agent-profitability-dashboard";

export const Route = createFileRoute("/analytics/")({
  component: AgentProfitabilityPage,
});

function AgentProfitabilityPage() {
  const searchParams = Route.useSearch() as {
    agentId?: string;
    customerId?: string;
  };

  return (
    <div className="container mx-auto py-6">
      <AgentProfitabilityDashboard
        agentId={searchParams?.agentId}
        customerId={searchParams?.customerId}
      />
    </div>
  );
}
