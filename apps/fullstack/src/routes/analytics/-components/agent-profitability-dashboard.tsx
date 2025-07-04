import { useNavigate } from "@tanstack/react-router";
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
import { Combobox } from "~/components/ui/combobox";
import {
  getAgentsList,
  getCustomersList,
} from "~/lib/analytics/agent-customer-list.functions";
import { getAgentProfitabilitySummary } from "~/lib/analytics/agent-profitability.functions";
import { formatCurrency } from "~/lib/utils/currency";

interface AgentProfitabilityDashboardProps {
  agentId?: string;
  customerId?: string;
}

const KPIBox = ({
  title,
  value,
  subtitle,
  isNegative,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  isNegative?: boolean;
}) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className={`text-2xl font-bold ${isNegative ? "text-red-600" : ""}`}>
        {value}
      </div>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
    </CardContent>
  </Card>
);

export function AgentProfitabilityDashboard({
  agentId,
  customerId,
}: AgentProfitabilityDashboardProps) {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date(),
  });
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>(
    []
  );
  const [selectorsLoading, setSelectorsLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Adjust start date to beginning of day (00:00:00.000)
      const adjustedStartDate = new Date(dateRange.from);
      adjustedStartDate.setHours(0, 0, 0, 0);
      
      // Adjust end date to end of day (23:59:59.999)
      const adjustedEndDate = new Date(dateRange.to);
      adjustedEndDate.setHours(23, 59, 59, 999);
      
      const profitability = await getAgentProfitabilitySummary({
        data: {
          agentId,
          customerId,
          dateRange: {
            startDate: adjustedStartDate.toISOString(),
            endDate: adjustedEndDate.toISOString(),
          },
        },
      });
      setData(profitability);
    } catch (error) {
      console.error("Error fetching profitability data:", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [agentId, customerId]);

  useEffect(() => {
    const loadSelectors = async () => {
      try {
        setSelectorsLoading(true);
        const [agentsList, customersList] = await Promise.all([
          getAgentsList(),
          getCustomersList(),
        ]);
        setAgents(agentsList);
        setCustomers(customersList);
      } catch (error) {
        console.error("Error loading selectors:", error);
      } finally {
        setSelectorsLoading(false);
      }
    };
    loadSelectors();
  }, []);

  const handleAgentChange = (value: string) => {
    const searchObj: Record<string, string> = {};
    if (value !== "all") searchObj.agentId = value;
    if (customerId) searchObj.customerId = customerId;
    navigate({ to: "/analytics", search: searchObj });
  };

  const handleCustomerChange = (value: string) => {
    const searchObj: Record<string, string> = {};
    if (agentId) searchObj.agentId = agentId;
    if (value !== "all") searchObj.customerId = value;
    navigate({ to: "/analytics", search: searchObj });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading profitability data...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Left Side - Main Content */}
      <div className="flex-1 space-y-6">
        {/* Filters and Date Range */}
        <Card>
          <CardHeader>
            <CardTitle>
              {!agentId
                ? "All Agents"
                : !customerId
                ? "Agent"
                : "Agent & Customer"}{" "}
              Profitability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {/* Selectors Row */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Agent</label>
                  <Combobox
                    options={[
                      { value: "all", label: "All Agents" },
                      ...agents.map((agent) => ({
                        value: agent.id,
                        label: agent.name,
                      })),
                    ]}
                    value={agentId || "all"}
                    onValueChange={handleAgentChange}
                    placeholder="All Agents"
                    searchPlaceholder="Search agents..."
                    emptyText="No agent found."
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">
                    Customer
                  </label>
                  <Combobox
                    options={[
                      { value: "all", label: "All Customers" },
                      ...customers.map((customer) => ({
                        value: customer.id,
                        label: customer.name,
                      })),
                    ]}
                    value={customerId || "all"}
                    onValueChange={handleCustomerChange}
                    placeholder="All Customers"
                    searchPlaceholder="Search customers..."
                    emptyText="No customer found."
                  />
                </div>
              </div>
              {/* Date Range Row */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
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
                        defaultMonth={dateRange.from}
                        onSelect={(date) =>
                          date && setDateRange({ ...dateRange, from: date })
                        }
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground">to</span>
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
                        defaultMonth={dateRange.to}
                        onSelect={(date) =>
                          date && setDateRange({ ...dateRange, to: date })
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <Button onClick={fetchData} disabled={loading}>
                  {loading ? "Loading..." : "Refresh"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KPIBox
            title="Total Revenue"
            value={formatCurrency(data.revenue)}
            subtitle={`${data.signalCallCount} signal calls`}
          />
          <KPIBox
            title="Total Costs"
            value={formatCurrency(data.costs)}
            subtitle={`${data.tokenUsageCount} AI requests`}
          />
          <KPIBox
            title="Profit"
            value={formatCurrency(data.profit)}
            subtitle={`${data.periodDays} day period`}
            isNegative={data.profit < 0}
          />
          <KPIBox
            title="Profit Margin"
            value={`${data.profitMargin.toFixed(1)}%`}
            subtitle={data.revenue === 0 ? "No revenue" : ""}
            isNegative={data.profitMargin < 0}
          />
        </div>
      </div>

      {/* Right Side - Revenue Breakdown */}
      <div className="w-80">
        {data.revenue > 0 ? (
          <Card className="h-fit sticky top-6">
            <CardHeader>
              <CardTitle>Revenue Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Signal Revenue</span>
                  <span className="font-semibold">{formatCurrency(data.signalRevenue)}</span>
                </div>
                {data.setupFeeRevenue > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Setup Fees</span>
                    <span className="font-semibold">{formatCurrency(data.setupFeeRevenue)}</span>
                  </div>
                )}
                {data.platformFeeRevenue > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Platform Fees</span>
                    <span className="font-semibold">{formatCurrency(data.platformFeeRevenue)}</span>
                  </div>
                )}
                {data.creditPurchaseRevenue > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Credit Sales</span>
                    <span className="font-semibold">{formatCurrency(data.creditPurchaseRevenue)}</span>
                  </div>
                )}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold">Total Revenue</span>
                    <span className="font-bold">{formatCurrency(data.revenue)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="h-fit sticky top-6">
            <CardHeader>
              <CardTitle>Revenue Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No revenue data available for the selected period.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
