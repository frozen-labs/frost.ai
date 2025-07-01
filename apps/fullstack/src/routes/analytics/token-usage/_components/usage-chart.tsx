import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

interface UsageDataPoint {
  periodStart: string;
  periodEnd: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
  requestCount: number;
}

interface UsageChartProps {
  data: UsageDataPoint[];
  title?: string;
  description?: string;
  periodType: "hour" | "day" | "week" | "month";
}

export function UsageChart({
  data,
  title = "Token Usage Over Time",
  description,
  periodType,
}: UsageChartProps) {
  const chartData = useMemo(() => {
    return data.map((point) => {
      const date = new Date(point.periodStart);
      let label = "";

      switch (periodType) {
        case "hour":
          label = date.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
          });
          break;
        case "day":
          label = date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          break;
        case "week":
          label = `Week of ${date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}`;
          break;
        case "month":
          label = date.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          });
          break;
      }

      return {
        label,
        ...point,
      };
    });
  }, [data, periodType]);

  const maxCost = Math.max(...chartData.map((d) => d.totalCost), 1);
  const maxTokens = Math.max(...chartData.map((d) => d.totalTokens), 1);

  const formatCost = (cost: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(cost);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No usage data available for this period
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cost Chart */}
            <div>
              <h4 className="text-sm font-medium mb-3">Cost Over Time</h4>
              <div className="space-y-2">
                {chartData.map((point, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground w-32 flex-shrink-0">
                      {point.label}
                    </div>
                    <div className="flex-1 relative">
                      <div className="h-6 bg-muted rounded-sm overflow-hidden">
                        <div
                          className="h-full bg-green-600 transition-all duration-500"
                          style={{
                            width: `${(point.totalCost / maxCost) * 100}%`,
                          }}
                        />
                      </div>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium">
                        {formatCost(point.totalCost)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Token Chart */}
            <div>
              <h4 className="text-sm font-medium mb-3">Token Usage</h4>
              <div className="space-y-2">
                {chartData.map((point, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground w-32 flex-shrink-0">
                      {point.label}
                    </div>
                    <div className="flex-1 relative">
                      <div className="h-6 bg-muted rounded-sm overflow-hidden flex">
                        <div
                          className="h-full bg-blue-600 transition-all duration-500"
                          style={{
                            width: `${
                              (point.totalInputTokens / maxTokens) * 100
                            }%`,
                          }}
                          title={`Input: ${formatNumber(
                            point.totalInputTokens
                          )}`}
                        />
                        <div
                          className="h-full bg-purple-600 transition-all duration-500"
                          style={{
                            width: `${
                              (point.totalOutputTokens / maxTokens) * 100
                            }%`,
                          }}
                          title={`Output: ${formatNumber(
                            point.totalOutputTokens
                          )}`}
                        />
                      </div>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium">
                        {formatNumber(point.totalTokens)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-600 rounded-sm" />
                  <span>Input Tokens</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-purple-600 rounded-sm" />
                  <span>Output Tokens</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
