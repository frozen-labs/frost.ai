import { createFileRoute } from "@tanstack/react-router";
import { AgentProfitabilityDashboard } from "./_components/agent-profitability-dashboard";

export const Route = createFileRoute("/analytics/agents/$agentId")({
  component: AgentProfitabilityPage,
});

function AgentProfitabilityPage() {
  const { agentId } = Route.useParams();
  const searchParams = Route.useSearch() as { customerId?: string };

  return (
    <div className="container mx-auto py-6">
      <AgentProfitabilityDashboard
        agentId={agentId}
        customerId={searchParams?.customerId}
      />
    </div>
  );
}
