import { createFileRoute } from "@tanstack/react-router";
import { UsageDashboard } from "./_components";

export const Route = createFileRoute("/analytics/token-usage/")({
  component: TokenUsagePage,
});

function TokenUsagePage() {
  // In a real application, you would get these from context or props
  // For now, we'll leave them undefined to show all usage
  const customerId = undefined;
  const agentId = undefined;

  return (
    <div className="container mx-auto py-8">
      <UsageDashboard customerId={customerId} agentId={agentId} />
    </div>
  );
}
