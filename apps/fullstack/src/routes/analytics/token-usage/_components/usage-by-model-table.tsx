import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

interface ModelUsageData {
  modelId: string;
  modelName: string;
  providerName: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
  requestCount: number;
}

interface UsageByModelTableProps {
  data: ModelUsageData[];
  title?: string;
  description?: string;
}

export function UsageByModelTable({
  data,
  title = "Usage by Model",
  description,
}: UsageByModelTableProps) {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  const formatCost = (costInCents: number) => {
    const costInDollars = costInCents / 100;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(costInDollars);
  };

  const sortedData = [...data].sort((a, b) => b.totalCost - a.totalCost);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium">Provider</th>
                <th className="text-left p-2 font-medium">Model</th>
                <th className="text-right p-2 font-medium">Input Tokens</th>
                <th className="text-right p-2 font-medium">Output Tokens</th>
                <th className="text-right p-2 font-medium">Total Tokens</th>
                <th className="text-right p-2 font-medium">Requests</th>
                <th className="text-right p-2 font-medium">Total Cost</th>
                <th className="text-right p-2 font-medium">Avg Cost</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((model) => (
                <tr key={model.modelId} className="border-b hover:bg-muted/50">
                  <td className="p-2 capitalize">{model.providerName}</td>
                  <td className="p-2">{model.modelName}</td>
                  <td className="p-2 text-right tabular-nums">
                    {formatNumber(model.totalInputTokens)}
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {formatNumber(model.totalOutputTokens)}
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {formatNumber(model.totalTokens)}
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {formatNumber(model.requestCount)}
                  </td>
                  <td className="p-2 text-right tabular-nums font-semibold">
                    {formatCost(model.totalCost)}
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {model.requestCount > 0
                      ? formatCost(model.totalCost / model.requestCount)
                      : "$0.00"}
                  </td>
                </tr>
              ))}
              {sortedData.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="p-4 text-center text-muted-foreground"
                  >
                    No usage data available
                  </td>
                </tr>
              )}
            </tbody>
            {sortedData.length > 0 && (
              <tfoot>
                <tr className="font-semibold">
                  <td colSpan={2} className="p-2">
                    Total
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {formatNumber(
                      sortedData.reduce((sum, m) => sum + m.totalInputTokens, 0)
                    )}
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {formatNumber(
                      sortedData.reduce(
                        (sum, m) => sum + m.totalOutputTokens,
                        0
                      )
                    )}
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {formatNumber(
                      sortedData.reduce((sum, m) => sum + m.totalTokens, 0)
                    )}
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {formatNumber(
                      sortedData.reduce((sum, m) => sum + m.requestCount, 0)
                    )}
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {formatCost(
                      sortedData.reduce((sum, m) => sum + m.totalCost, 0)
                    )}
                  </td>
                  <td className="p-2"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
