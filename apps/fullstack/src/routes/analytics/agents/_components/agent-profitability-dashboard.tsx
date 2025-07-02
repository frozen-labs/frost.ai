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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
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

interface KPIBoxProps {
  title: string;
  value: string | number;
  subtitle?: string;
  isNegative?: boolean;
}

function KPIBox({ title, value, subtitle, isNegative }: KPIBoxProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`text-2xl font-bold ${isNegative ? "text-red-600" : ""}`}
        >
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

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
      console.log(
        "Fetching data for agentId:",
        agentId,
        "customerId:",
        customerId
      );

      const profitability = await getAgentProfitabilitySummary({
        data: {
          agentId,
          customerId,
          dateRange: {
            startDate: dateRange.from.toISOString(),
            endDate: dateRange.to.toISOString(),
          },
        },
      });

      console.log("Profitability data:", profitability);
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
        console.log("Loaded agents:", agentsList);
        console.log("Loaded customers:", customersList);
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
    navigate({ to: "/analytics/agents", search: searchObj });
  };

  const handleCustomerChange = (value: string) => {
    const searchObj: Record<string, string> = {};
    if (agentId) searchObj.agentId = agentId;
    if (value !== "all") searchObj.customerId = value;
    navigate({ to: "/analytics/agents", search: searchObj });
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
    <div className="space-y-6">
      {/* Filters and Date Range */}
      <Card>
        <CardHeader>
          <CardTitle>
            {!agentId
              ? "All Agents"
              : agentId && !customerId
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
                <Select
                  value={agentId || "all"}
                  onValueChange={handleAgentChange}
                  disabled={selectorsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Agents</SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">
                  Customer
                </label>
                <Select
                  value={customerId || "all"}
                  onValueChange={handleCustomerChange}
                  disabled={selectorsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

      {/* KPI Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
  );
}
