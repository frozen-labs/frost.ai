import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  getTokenUsageByModel,
  getTokenUsageSummary,
} from "~/lib/cost-tracking/token-usage.functions";
import { UsageByModelTable } from "./usage-by-model-table";
import { UsageChart } from "./usage-chart";
import { UsageSummaryCard } from "./usage-summary-card";

interface UsageDashboardProps {
  customerId?: string;
  agentId?: string;
}

export function UsageDashboard({ customerId, agentId }: UsageDashboardProps) {
  const [periodType, setPeriodType] = useState<
    "hour" | "day" | "week" | "month"
  >("day");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    to: new Date(),
  });
  const [summaryData, setSummaryData] = useState<any>(null);
  const [modelData, setModelData] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const filters = {
        customerId,
        agentId,
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
      };

      // Fetch summary
      const summaryData = await getTokenUsageSummary({ data: filters });
      setSummaryData(summaryData);

      // Fetch by model
      const modelData = await getTokenUsageByModel({ data: filters });
      setModelData(modelData);

      // For now, use summary data for chart until we implement time-series data
      setChartData([summaryData]);
    } catch (error) {
      console.error("Error fetching usage data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [customerId, agentId, dateRange, periodType]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Token Usage Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.from, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) =>
                      date && setDateRange({ ...dateRange, from: date })
                    }
                  />
                </PopoverContent>
              </Popover>
              <span className="self-center">to</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.to, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) =>
                      date && setDateRange({ ...dateRange, to: date })
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Select
              value={periodType}
              onValueChange={(value: any) => setPeriodType(value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hour">Hourly</SelectItem>
                <SelectItem value="day">Daily</SelectItem>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchData} disabled={loading}>
              {loading ? "Loading..." : "Refresh"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {summaryData && (
        <UsageSummaryCard
          data={summaryData}
          description={`Total usage from ${format(
            dateRange.from,
            "PP"
          )} to ${format(dateRange.to, "PP")}`}
        />
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <UsageChart
          data={chartData}
          periodType={periodType}
          description="Token usage and costs over time"
        />
        <UsageByModelTable
          data={modelData}
          description="Breakdown by AI model"
        />
      </div>
    </div>
  );
}
