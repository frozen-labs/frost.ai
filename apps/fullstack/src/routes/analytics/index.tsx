import { createFileRoute } from "@tanstack/react-router";
import { endOfMonth, format, startOfMonth } from "date-fns";
import {
  Activity,
  BarChart3,
  Bot,
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  ChevronsUpDown,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { Input } from "~/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "~/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  getAllCustomers,
  getCustomerAgentSummary,
  getCustomerAnalytics,
  getCustomerPaymentSummary,
  getRecentSignalCalls,
} from "~/lib/analytics/analytic.functions";
import { formatCurrency } from "~/lib/utils/currency";
import { cn } from "~/lib/utils/styles";

type Customer = {
  id: string;
  name: string;
};

type Analytics = {
  signalId: string;
  signalName: string;
  pricePerCallCents: number;
  callCount: number;
  totalCost: number;
};

type PaymentSummary = {
  totalCalls: number;
  totalAmount: number;
  uniqueSignals: number;
};

type RecentCall = {
  id: string;
  signalName: string;
  signalId: string;
  agentName: string;
  pricePerCallCents: number;
  timestamp: Date;
  metadata: Record<string, any> | null;
};

type AgentSummary = {
  agentCount: number;
  agents: Array<{
    agentId: string;
    agentName: string;
    signalCount: number;
  }>;
};

export const Route = createFileRoute("/analytics/")({
  loader: async () => {
    const customers = await getAllCustomers();
    return { customers };
  },
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { customers } = Route.useLoaderData();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [isCustomerComboOpen, setIsCustomerComboOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);

  const [analytics, setAnalytics] = useState<Analytics[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(
    null
  );
  const [agentSummary, setAgentSummary] = useState<AgentSummary | null>(null);
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [totalCalls, setTotalCalls] = useState(0);
  const [loading, setLoading] = useState(false);

  // Pagination and search for recent calls
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [expandedCall, setExpandedCall] = useState<string | null>(null);
  const callsPerPage = 10;

  const selectedCustomer = customers.find(
    (c: Customer) => c.id === selectedCustomerId
  );

  const fetchAnalytics = async () => {
    if (!selectedCustomerId || !dateRange?.from || !dateRange?.to) return;

    setLoading(true);
    try {
      const [analyticsData, summaryData, agentData, callsData] =
        await Promise.all([
          getCustomerAnalytics({
            data: {
              customerId: selectedCustomerId,
              startDate: dateRange.from.toISOString(),
              endDate: dateRange.to.toISOString(),
            },
          }),
          getCustomerPaymentSummary({
            data: {
              customerId: selectedCustomerId,
              startDate: dateRange.from.toISOString(),
              endDate: dateRange.to.toISOString(),
            },
          }),
          getCustomerAgentSummary({
            data: {
              customerId: selectedCustomerId,
              startDate: dateRange.from.toISOString(),
              endDate: dateRange.to.toISOString(),
            },
          }),
          getRecentSignalCalls({
            data: {
              customerId: selectedCustomerId,
              page: currentPage,
              limit: callsPerPage,
              search: debouncedSearchTerm,
              startDate: dateRange?.from?.toISOString(),
              endDate: dateRange?.to?.toISOString(),
            },
          }),
        ]);

      setAnalytics(analyticsData);
      setPaymentSummary(summaryData);
      setAgentSummary(agentData);
      setRecentCalls(callsData.calls);
      setTotalCalls(callsData.total);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms debounce delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when debounced search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedCustomerId, dateRange, currentPage, debouncedSearchTerm]);

  const totalPages = Math.ceil(totalCalls / callsPerPage);

  const dateRangeText = useMemo(() => {
    if (!dateRange?.from) return "Pick a date range";
    if (dateRange.to) {
      return `${format(dateRange.from, "MMM dd")} - ${format(
        dateRange.to,
        "MMM dd, yyyy"
      )}`;
    }
    return `From ${format(dateRange.from, "MMM dd, yyyy")}...`;
  }, [dateRange]);

  return (
    <div className="container mx-auto p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Analytics Dashboard</CardTitle>
          <CardDescription>
            Track signal usage and costs by customer
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Select Customer
          </label>
          <Popover
            open={isCustomerComboOpen}
            onOpenChange={setIsCustomerComboOpen}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={isCustomerComboOpen}
                className="w-full justify-between"
              >
                {selectedCustomerId
                  ? (() => {
                      const customer = customers.find(
                        (c: Customer) => c.id === selectedCustomerId
                      );
                      return customer ? customer.name : "Select customer...";
                    })()
                  : "Select customer..."}
                <ChevronsUpDown className="opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <Command>
                <CommandInput
                  placeholder="Search customers..."
                  className="h-9"
                />
                <CommandList>
                  <CommandEmpty>No customer found.</CommandEmpty>
                  <CommandGroup>
                    {customers.map((customer: Customer) => (
                      <CommandItem
                        key={customer.id}
                        value={`${customer.name} ${customer.id}`}
                        onSelect={() => {
                          setSelectedCustomerId(
                            customer.id === selectedCustomerId
                              ? ""
                              : customer.id
                          );
                          setIsCustomerComboOpen(false);
                        }}
                      >
                        <div className="flex flex-col w-full">
                          <span>{customer.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ID: {customer.id}
                          </span>
                        </div>
                        <Check
                          className={cn(
                            "ml-auto",
                            selectedCustomerId === customer.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Date Range</label>
          <Popover open={isDateRangeOpen} onOpenChange={setIsDateRangeOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRangeText}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                defaultMonth={dateRange?.from}
              />
              <div className="p-3 border-t text-xs text-muted-foreground">
                Click first date to set start, then click second date to set
                end.{" "}
                <button
                  onClick={() => setDateRange(undefined)}
                  className="underline hover:text-foreground"
                >
                  Clear selection
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {!selectedCustomerId ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">
                Select a customer to view analytics
              </p>
              <p className="text-muted-foreground">
                Choose a customer from the dropdown above
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>
                      <Activity className="h-4 w-4 mr-2 inline" />
                      Recent Signal Calls - {selectedCustomer?.name}
                    </CardTitle>
                    <CardDescription>
                      {loading ? "Loading..." : `${totalCalls} total calls`}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchAnalytics}
                    disabled={loading}
                  >
                    <RefreshCw
                      className={`h-4 w-4 mr-2 ${
                        loading ? "animate-spin" : ""
                      }`}
                    />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by signal or agent name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    {searchTerm !== debouncedSearchTerm && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />
                      </div>
                    )}
                  </div>
                  {searchTerm && searchTerm !== debouncedSearchTerm && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      Waiting to search...
                    </div>
                  )}
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-muted-foreground">
                      Loading analytics...
                    </div>
                  </div>
                ) : recentCalls.length > 0 ? (
                  <>
                    <div className="space-y-2 mb-4">
                      {recentCalls.map((call) => (
                        <Collapsible
                          key={call.id}
                          open={expandedCall === call.id}
                          onOpenChange={(open) =>
                            setExpandedCall(open ? call.id : null)
                          }
                        >
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                              <div className="flex-1">
                                <p className="font-medium">{call.signalName}</p>
                                <p className="text-sm text-muted-foreground">
                                  <Bot className="h-3 w-3 inline mr-1" />
                                  {call.agentName} •{" "}
                                  {call.timestamp.toLocaleString()}
                                </p>
                              </div>
                              <div className="text-right mr-2">
                                <p className="text-sm font-medium">
                                  {formatCurrency(call.pricePerCallCents || 0)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  per call
                                </p>
                              </div>
                              <ChevronDown className="h-4 w-4" />
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="px-3 pb-3">
                            <div className="mt-2 p-3 bg-muted rounded-md">
                              <p className="text-sm">
                                <strong>Signal ID:</strong> {call.signalId}
                              </p>
                              {call.metadata && (
                                <div className="mt-2">
                                  <p className="text-sm font-medium">
                                    Metadata:
                                  </p>
                                  <pre className="text-xs text-muted-foreground mt-1">
                                    {JSON.stringify(call.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>

                    {totalPages > 1 && (
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() =>
                                setCurrentPage(Math.max(1, currentPage - 1))
                              }
                              className={
                                currentPage === 1
                                  ? "pointer-events-none opacity-50"
                                  : "cursor-pointer"
                              }
                            />
                          </PaginationItem>

                          {Array.from(
                            { length: Math.min(5, totalPages) },
                            (_, i) => {
                              const page = i + 1;
                              return (
                                <PaginationItem key={page}>
                                  <PaginationLink
                                    onClick={() => setCurrentPage(page)}
                                    isActive={currentPage === page}
                                    className="cursor-pointer"
                                  >
                                    {page}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            }
                          )}

                          {totalPages > 5 && (
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                          )}

                          <PaginationItem>
                            <PaginationNext
                              onClick={() =>
                                setCurrentPage(
                                  Math.min(totalPages, currentPage + 1)
                                )
                              }
                              className={
                                currentPage === totalPages
                                  ? "pointer-events-none opacity-50"
                                  : "cursor-pointer"
                              }
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm
                      ? `No calls found matching "${searchTerm}"`
                      : "No signal calls found for the selected period"}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>
                  <TrendingUp className="h-4 w-4 mr-2 inline" />
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {paymentSummary && agentSummary && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Total Calls
                      </span>
                      <span className="font-medium">
                        {paymentSummary.totalCalls.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Unique Signals
                      </span>
                      <span className="font-medium">
                        {paymentSummary.uniqueSignals}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        <Users className="h-3 w-3 inline mr-1" />
                        Agents Used
                      </span>
                      <span className="font-medium">
                        {agentSummary.agentCount}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Total Amount
                      </span>
                      <span className="font-medium">
                        {formatCurrency(paymentSummary.totalAmount)}
                      </span>
                    </div>

                    {agentSummary.agents.length > 0 && (
                      <div className="pt-4 border-t">
                        <p className="text-sm font-medium mb-2">
                          Agents Breakdown
                        </p>
                        <div className="space-y-2">
                          {agentSummary.agents.map((agent) => (
                            <div
                              key={agent.agentId}
                              className="flex justify-between text-sm"
                            >
                              <span className="text-muted-foreground truncate">
                                {agent.agentName}
                              </span>
                              <span className="font-medium">
                                {agent.signalCount} signals
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {analytics.length > 0 && (
                      <div className="pt-4 border-t">
                        <p className="text-sm font-medium mb-2">Signal Costs</p>
                        <div className="space-y-2">
                          {analytics.map((signal) => (
                            <div
                              key={signal.signalId}
                              className="flex justify-between text-sm"
                            >
                              <span className="text-muted-foreground truncate">
                                {signal.signalName}
                              </span>
                              <span className="font-medium">
                                {formatCurrency(signal.totalCost)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
