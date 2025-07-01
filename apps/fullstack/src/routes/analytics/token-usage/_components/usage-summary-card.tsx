import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

interface UsageSummaryData {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
  requestCount: number;
}

interface UsageSummaryCardProps {
  data: UsageSummaryData;
  title?: string;
  description?: string;
}

export function UsageSummaryCard({
  data,
  title = "Token Usage Summary",
  description,
}: UsageSummaryCardProps) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Input Tokens
            </p>
            <p className="text-2xl font-bold">
              {formatNumber(data.totalInputTokens)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Output Tokens
            </p>
            <p className="text-2xl font-bold">
              {formatNumber(data.totalOutputTokens)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Total Tokens
            </p>
            <p className="text-2xl font-bold">
              {formatNumber(data.totalTokens)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Requests
            </p>
            <p className="text-2xl font-bold">
              {formatNumber(data.requestCount)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Total Cost
            </p>
            <p className="text-2xl font-bold text-green-600">
              {formatCost(data.totalCost)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Avg Cost/Request
            </p>
            <p className="text-2xl font-bold">
              {data.requestCount > 0
                ? formatCost(data.totalCost / data.requestCount)
                : "$0.00"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
