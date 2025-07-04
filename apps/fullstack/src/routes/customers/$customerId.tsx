import { useForm } from "@tanstack/react-form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowLeft, Plus } from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { 
  getCustomer, 
  saveCustomer, 
  getAllAgents, 
  getCreditSignals,
  linkAgentToCustomer,
  unlinkAgentFromCustomer,
  linkAgentWithFees,
  createCreditAllocation,
  updateCreditAllocation,
  removeCreditAllocation
} from "~/lib/customers/customer.functions";
import { type Customer, type Agent } from "~/lib/database/types";
import { formatCurrencyInput, parseCurrencyInput } from "~/lib/utils/currency";

export const Route = createFileRoute("/customers/$customerId")({
  loader: async ({ params }) => {
    const customerData = await getCustomer({
      data: { customerId: params.customerId },
    });
    
    // Get all agents and credit signals in parallel
    const [allAgents, creditSignals] = await Promise.all([
      getAllAgents({}),
      getCreditSignals({}),
    ]);
    
    return { 
      customerData,
      allAgents,
      creditSignals,
    };
  },
  component: CustomerFormPage,
});

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  customerSlug: z.string().min(1, "Slug is required"),
});

type CreditSignalAgent = {
  agentId: string;
  agentName: string;
  creditSignals: Array<{
    id: string;
    name: string;
    slug: string;
    creditsPerCallCents: number;
  }>;
};

// Create flattened agent+signal combinations for search
const createAgentSignalOptions = (creditSignals: CreditSignalAgent[]) => {
  const options: Array<{
    id: string;
    agentId: string;
    agentName: string;
    signalId: string;
    signalName: string;
    creditsPerCall: number;
    searchText: string;
  }> = [];

  creditSignals.forEach((agent) => {
    agent.creditSignals.forEach((signal) => {
      options.push({
        id: `${agent.agentId}-${signal.id}`,
        agentId: agent.agentId,
        agentName: agent.agentName,
        signalId: signal.id,
        signalName: signal.name,
        creditsPerCall: signal.creditsPerCallCents,
        searchText: `${agent.agentName} ${signal.name}`.toLowerCase(),
      });
    });
  });

  return options;
};

type CreditAllocation = {
  id: string;
  agentId: string;
  agentName: string;
  signalId: string;
  signalName: string;
  creditsCents: number;
  isEditing?: boolean;
};

type CustomerWithAllocations = Customer & {
  creditAllocations: Array<{
    id: string;
    agentId: string;
    agentName: string;
    signalId: string;
    signalName: string;
    creditsCents: number;
  }>;
  linkedAgentIds: string[];
};

function CustomerFormPage() {
  const navigate = useNavigate();
  const { customerId } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const customerData = loaderData.customerData as CustomerWithAllocations | null;
  const customer = customerData as Customer | null;
  const allAgents = ((loaderData.allAgents || []) as Agent[]).map(agent => ({
    ...agent,
    isRestricted: Boolean(agent.setupFeeEnabled) || Boolean(agent.platformFeeEnabled)
  }));
  const creditSignals = loaderData.creditSignals || [];

  const isNewCustomer = customerId === "new";

  // Credit management state - initialize from loader data
  const [creditAllocations, setCreditAllocations] = useState<
    CreditAllocation[]
  >(() => {
    if (customerData?.creditAllocations) {
      return customerData.creditAllocations.map((alloc) => ({
        id: alloc.id,
        agentId: alloc.agentId,
        agentName: alloc.agentName,
        signalId: alloc.signalId,
        signalName: alloc.signalName,
        creditsCents: alloc.creditsCents,
        isEditing: false,
      }));
    }
    return [];
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [currentCreditsSearch, setCurrentCreditsSearch] = useState("");

  // Fee confirmation dialog state
  const [feeConfirmationOpen, setFeeConfirmationOpen] = useState(false);
  const [pendingAgentId, setPendingAgentId] = useState<string | null>(null);
  const [pendingAgentInfo, setPendingAgentInfo] = useState<{
    name: string;
    setupFee: number;
    platformFee: number;
    billingCycle: string;
  } | null>(null);

  // Agent linking state - initialize from loader data
  const [linkedAgents, setLinkedAgents] = useState<string[]>(
    customerData?.linkedAgentIds || []
  );
  const [agentSearchTerm, setAgentSearchTerm] = useState("");

  // Get all agent+signal options for search
  const agentSignalOptions = useMemo(() => createAgentSignalOptions(creditSignals), [creditSignals]);

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return agentSignalOptions;
    return agentSignalOptions.filter((option) =>
      option.searchText.includes(searchTerm.toLowerCase())
    );
  }, [agentSignalOptions, searchTerm]);

  // Filter agents for linking based on search
  const filteredAgents = useMemo(() => {
    if (!agentSearchTerm) return allAgents;
    return allAgents.filter((agent) =>
      agent.name.toLowerCase().includes(agentSearchTerm.toLowerCase())
    );
  }, [agentSearchTerm, allAgents]);

  const form = useForm({
    defaultValues: {
      name: customer?.name || "",
      customerSlug: customer?.slug || "",
    },
    validators: {
      onChange: formSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        const savedCustomerId = await saveCustomer({
          data: {
            customerId,
            name: value.name,
            slug: value.customerSlug,
          },
        });

        // If this is a new customer or we have a valid ID, save the additional data
        const targetCustomerId = isNewCustomer ? savedCustomerId : customerId;
        
        if (targetCustomerId) {
          // Save all linked agents (apply fees if agents have them)
          for (const agentId of linkedAgents) {
            const agent = allAgents.find(a => a.id === agentId);
            if (agent && (agent.setupFeeEnabled || agent.platformFeeEnabled)) {
              // Use the fee-aware linking for agents with fees
              await linkAgentWithFees({
                data: { customerId: targetCustomerId, agentId }
              });
            } else {
              // Use regular linking for agents without fees
              await linkAgentToCustomer({
                data: {
                  customerId: targetCustomerId,
                  agentId,
                },
              });
            }
          }
          
          // Save all credit allocations
          for (const allocation of creditAllocations) {
            await createCreditAllocation({
              data: {
                customerId: targetCustomerId,
                agentId: allocation.agentId,
                signalId: allocation.signalId,
                creditsCents: allocation.creditsCents,
              },
            });
          }
        }

        toast.success(
          isNewCustomer
            ? "Customer created successfully!"
            : "Customer updated successfully!"
        );
        navigate({ to: "/customers" });
      } catch (error) {
        toast.error(
          isNewCustomer
            ? "Failed to create customer"
            : "Failed to update customer"
        );
        console.error("Error saving customer:", error);
      }
    },
  });
    // Compute slug from name
    const computeSlug = (inputName: string) => {
      return inputName.toLowerCase().replace(/\s+/g, "-");
    };
  const handleCancel = () => {
    navigate({ to: "/customers" });
  };

  // Handle adding new allocation (enhanced to optionally handle purchases)
  const handleAddAllocation = async (
    option: (typeof agentSignalOptions)[0],
    credits: number,
    price?: number
  ) => {
    // For new customers, just add to local state
    if (isNewCustomer) {
      const newAllocation: CreditAllocation = {
        id: Date.now().toString(),
        agentId: option.agentId,
        agentName: option.agentName,
        signalId: option.signalId,
        signalName: option.signalName,
        creditsCents: credits,
      };

      setCreditAllocations((prev) => [...prev, newAllocation]);
      setSearchTerm("");
      return;
    }

    // For existing customers, save immediately
    try {
      await createCreditAllocation({
        data: {
          customerId,
          agentId: option.agentId,
          signalId: option.signalId,
          creditsCents: credits,
          priceTotal: price,
        },
      });

      // Reload data
      const updatedData = await getCustomer({
        data: { customerId },
      }) as CustomerWithAllocations | null;
      
      if (updatedData?.creditAllocations) {
        setCreditAllocations(updatedData.creditAllocations.map((alloc) => ({
          ...alloc,
          isEditing: false,
        })));
      }
      
      setSearchTerm("");
      
      if (price && price > 0) {
        toast.success(`Purchased ${(credits / 100).toFixed(2)} credits for $${price.toFixed(2)}`);
      } else {
        toast.success("Credit allocation added");
      }
    } catch (error) {
      toast.error(price && price > 0 ? "Failed to purchase credits" : "Failed to add credit allocation");
      console.error(error);
    }
  };

  // Handle updating credits
  const handleUpdateCredits = async (id: string, creditsCents: number) => {
    const allocation = creditAllocations.find(a => a.id === id);
    if (!allocation) return;

    // Update local state first
    setCreditAllocations((prev) =>
      prev.map((alloc) =>
        alloc.id === id
          ? { ...alloc, creditsCents, isEditing: false }
          : alloc
      )
    );

    // For existing customers, save to database
    if (!isNewCustomer) {
      try {
        await updateCreditAllocation({
          data: {
            allocationId: allocation.id,
            creditsCents,
          },
        });
        toast.success("Credits updated");
      } catch (error) {
        toast.error("Failed to update credits");
        console.error(error);
        // Revert on error
        setCreditAllocations((prev) =>
          prev.map((alloc) =>
            alloc.id === id
              ? { ...alloc, creditsCents: allocation.creditsCents }
              : alloc
          )
        );
      }
    }
  };

  // Handle removing allocation
  const handleRemoveAllocation = async (id: string) => {
    // For new customers, just remove from local state
    if (isNewCustomer) {
      setCreditAllocations((prev) =>
        prev.filter((allocation) => allocation.id !== id)
      );
      return;
    }

    // For existing customers, delete from database
    try {
      await removeCreditAllocation({
        data: { allocationId: id },
      });
      
      setCreditAllocations((prev) =>
        prev.filter((allocation) => allocation.id !== id)
      );
      
      toast.success("Credit allocation removed");
    } catch (error) {
      toast.error("Failed to remove credit allocation");
      console.error(error);
    }
  };

  // Handle toggle editing
  const handleToggleEdit = (id: string) => {
    setCreditAllocations((prev) =>
      prev.map(
        (allocation) =>
          allocation.id === id
            ? { ...allocation, isEditing: !allocation.isEditing }
            : { ...allocation, isEditing: false } // Close other editing rows
      )
    );
  };

  // Handle linking agents with fee confirmation
  const handleLinkAgent = async (agentId: string) => {
    if (!linkedAgents.includes(agentId)) {
      // Find the agent to check for fees
      const agent = allAgents.find(a => a.id === agentId);
      
      if (agent && (agent.setupFeeEnabled || agent.platformFeeEnabled)) {
        // Agent has fees - show confirmation dialog
        setPendingAgentId(agentId);
        setPendingAgentInfo({
          name: agent.name,
          setupFee: agent.setupFeeEnabled ? (agent.setupFeeCents || 0) / 100 : 0,
          platformFee: agent.platformFeeEnabled ? (agent.platformFeeCents || 0) / 100 : 0,
          billingCycle: agent.platformFeeBillingCycle || 'monthly',
        });
        setFeeConfirmationOpen(true);
      } else {
        // No fees - link directly
        await confirmLinkAgent(agentId, false);
      }
    }
  };

  // Confirm linking agent (with or without fees)
  const confirmLinkAgent = async (agentId: string, withFees: boolean = false) => {
    setLinkedAgents((prev) => [...prev, agentId]);
    setAgentSearchTerm("");

    // For existing customers, save immediately
    if (!isNewCustomer) {
      try {
        if (withFees) {
          const result = await linkAgentWithFees({
            data: { customerId, agentId }
          });
          
          if (result.feesApplied) {
            const fees = result.feesApplied;
            let feeMessage = "Agent linked";
            if (fees.setupFee > 0 || fees.platformFee > 0) {
              const feeDetails = [];
              if (fees.setupFee > 0) feeDetails.push(`Setup fee: $${fees.setupFee.toFixed(2)}`);
              if (fees.platformFee > 0) feeDetails.push(`Platform fee: $${fees.platformFee.toFixed(2)}`);
              feeMessage += ` (${feeDetails.join(', ')} applied)`;
            }
            toast.success(feeMessage);
          } else {
            toast.success("Agent linked");
          }
        } else {
          await linkAgentToCustomer({
            data: {
              customerId,
              agentId,
            },
          });
          toast.success("Agent linked");
        }
      } catch (error) {
        toast.error("Failed to link agent");
        console.error(error);
        // Revert on error
        setLinkedAgents((prev) => prev.filter((id) => id !== agentId));
      }
    }
  };

  // Handle unlinking agents
  const handleUnlinkAgent = async (agentId: string) => {
    setLinkedAgents((prev) => prev.filter((id) => id !== agentId));

    // For existing customers, save immediately
    if (!isNewCustomer) {
      try {
        await unlinkAgentFromCustomer({
          data: {
            customerId,
            agentId,
          },
        });
        toast.success("Agent unlinked");
      } catch (error) {
        toast.error("Failed to unlink agent");
        console.error(error);
        // Revert on error
        setLinkedAgents((prev) => [...prev, agentId]);
      }
    }
  };

  // Column definitions for the data table
  const columns: ColumnDef<CreditAllocation>[] = [
    {
      accessorKey: "agentSignal",
      header: "Agent ▸ Signal",
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.agentName} ▸ {row.original.signalName}
        </div>
      ),
    },
    {
      accessorKey: "credits",
      header: "Credits",
      cell: ({ row }) => {
        const [editValue, setEditValue] = useState("");
        const [isInitialized, setIsInitialized] = useState(false);
        const allocation = row.original;

        // Initialize edit value when editing starts
        React.useEffect(() => {
          if (allocation.isEditing && !isInitialized) {
            setEditValue(formatCurrencyInput(allocation.creditsCents));
            setIsInitialized(true);
          } else if (!allocation.isEditing) {
            setEditValue("");
            setIsInitialized(false);
          }
        }, [allocation.isEditing, allocation.creditsCents, isInitialized]);

        if (allocation.isEditing) {
          return (
            <Input
              type="text"
              value={editValue}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "" || /^\d*\.?\d*$/.test(value)) {
                  setEditValue(value);
                }
              }}
              onBlur={() => {
                if (editValue) {
                  const cents = parseCurrencyInput(editValue);
                  setEditValue(formatCurrencyInput(cents));
                  handleUpdateCredits(allocation.id, cents);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (editValue) {
                    const cents = parseCurrencyInput(editValue);
                    setEditValue(formatCurrencyInput(cents));
                    handleUpdateCredits(allocation.id, cents);
                  }
                } else if (e.key === "Escape") {
                  setEditValue("");
                  handleToggleEdit(allocation.id);
                }
              }}
              className="w-[120px]"
              autoFocus
            />
          );
        }

        return (
          <div
            className="cursor-pointer hover:bg-muted p-1 rounded"
            onClick={() => handleToggleEdit(allocation.id)}
          >
            {(allocation.creditsCents / 100).toFixed(2)}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const allocation = row.original;

        if (allocation.isEditing) {
          return (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleToggleEdit(allocation.id)}
              >
                Cancel
              </Button>
            </div>
          );
        }

        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleToggleEdit(allocation.id)}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRemoveAllocation(allocation.id)}
            >
              Remove
            </Button>
          </div>
        );
      },
    },
  ];

  // React Table setup
  const table = useReactTable({
    data: creditAllocations,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      const allocation = row.original;
      const searchText =
        `${allocation.agentName} ${allocation.signalName}`.toLowerCase();
      return searchText.includes(filterValue.toLowerCase());
    },
    state: {
      globalFilter: currentCreditsSearch,
    },
    onGlobalFilterChange: setCurrentCreditsSearch,
  });

  return (
    <div className="p-8">
      <Button variant="ghost" onClick={handleCancel} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Customers
      </Button>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>
            {isNewCustomer ? "Create New Customer" : "Edit Customer"}
          </CardTitle>
          <CardDescription>
            {isNewCustomer
              ? "Add a new customer to your system"
              : "Update customer information"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="space-y-6"
          >
            <form.Field name="name">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Customer Name</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Customer name"
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-red-600">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  )}
                </div>
              )}
            </form.Field>
            <form.Subscribe
              selector={(state) => state.values.name}
              children={(name) => {
                const computedSlug = computeSlug(name);
                return (
                  <form.Field name="customerSlug">
                    {(field) => {
                      // Update the field value when the computed slug changes
                      if (field.state.value !== computedSlug) {
                        field.handleChange(computedSlug);
                      }
                      return (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>Customer Slug</Label>
                          <p className="text-sm text-muted-foreground">
                            This slug is used to identify the customer in the
                            API. It's automatically computed from the customer
                            name.
                          </p>
                          <Input
                            id={field.name}
                            name={field.name}
                            value={computedSlug}
                            readOnly
                            className="bg-muted cursor-text"
                          />
                        </div>
                      );
                    }}
                  </form.Field>
                );
              }}
            />

            {!isNewCustomer && customer && (
              <div className="space-y-2">
                <Label>Customer ID</Label>
                <div className="px-3 py-2 bg-muted rounded-md text-sm font-mono">
                  {customer.id}
                </div>
                <p className="text-sm text-muted-foreground">
                  This is the unique customer identifier
                </p>
              </div>
            )}

            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <div className="flex gap-4">
                  <Button type="submit" disabled={!canSubmit}>
                    {isSubmitting
                      ? "..."
                      : isNewCustomer
                      ? "Create Customer"
                      : "Save Changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </form.Subscribe>
          </form>
        </CardContent>
      </Card>

      {!isNewCustomer && customer && (
        <Card className="max-w-2xl mt-6">
          <CardHeader>
            <CardTitle>Agent Access</CardTitle>
            <CardDescription>
              Link this customer to specific agents. Restricted agents require linking before use.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Agent Search and Linking */}
              <div className="space-y-4">
                <Label className="text-lg">Link Agents</Label>
                
                {/* Agent Search Bar */}
                <div className="space-y-2">
                  <Label htmlFor="agent-search" className="text-sm font-medium">
                    Search Available Agents
                  </Label>
                  <Input
                    id="agent-search"
                    type="text"
                    value={agentSearchTerm}
                    onChange={(e) => setAgentSearchTerm(e.target.value)}
                    placeholder="Type agent name to search..."
                    className="w-full"
                  />
                </div>

                {/* Search Results for Agent Linking */}
                {agentSearchTerm && filteredAgents.length > 0 && (
                  <div className="border rounded-lg p-4 bg-muted/20">
                    <Label className="text-sm font-medium mb-2 block">
                      Available Agents:
                    </Label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {filteredAgents
                        .filter((agent) => !linkedAgents.includes(agent.id))
                        .slice(0, 5)
                        .map((agent) => (
                          <div
                            key={agent.id}
                            className="flex items-center justify-between p-2 border rounded-lg bg-background"
                          >
                            <div>
                              <span className="font-medium">{agent.name}</span>
                              {agent.isRestricted && (
                                <span className="text-sm text-orange-600 ml-2">
                                  (Restricted)
                                </span>
                              )}
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleLinkAgent(agent.id)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Link
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {agentSearchTerm && filteredAgents.filter((agent) => !linkedAgents.includes(agent.id)).length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    No available agents found or all matching agents are already linked.
                  </div>
                )}

                {/* Currently Linked Agents */}
                {linkedAgents.length > 0 && (
                  <div className="space-y-4">
                    <Label className="text-lg">Linked Agents</Label>
                    <div className="space-y-2">
                      {linkedAgents.map((agentId) => {
                        const agent = allAgents.find((a) => a.id === agentId);
                        if (!agent) return null;
                        
                        return (
                          <div
                            key={agentId}
                            className="flex items-center justify-between p-3 border rounded-lg bg-background"
                          >
                            <div>
                              <span className="font-medium">{agent.name}</span>
                              {agent.isRestricted && (
                                <span className="text-sm text-orange-600 ml-2">
                                  (Restricted)
                                </span>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnlinkAgent(agentId)}
                            >
                              Remove
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {linkedAgents.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No agents linked yet. Search and link agents above.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isNewCustomer && customer && (
        <Card className="max-w-2xl mt-6">
          <CardHeader>
            <CardTitle>Credit Management</CardTitle>
            <CardDescription>
              Allocate credits to specific agent signals for this customer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Search and Add Credits */}
              <div className="space-y-4">
                <Label className="text-lg">Add Credits</Label>

                {/* Signal Search Bar */}
                <div className="space-y-2">
                  <Label htmlFor="search" className="text-sm font-medium">
                    Search Credit Signals
                  </Label>
                  <Input
                    id="search"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search for credit-based signals (e.g., 'Premium Feature', 'Advanced Analytics')"
                    className="w-full"
                  />
                </div>

                {/* Search Results for Adding */}
                {searchTerm && filteredOptions.length > 0 && (
                  <div className="border rounded-lg p-4 bg-muted/20">
                    <Label className="text-sm font-medium mb-2 block">
                      Add Credits:
                    </Label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {filteredOptions.slice(0, 5).map((option) => (
                        <div
                          key={option.id}
                          className="flex items-center justify-between p-2 border rounded-lg bg-background"
                        >
                          <div>
                            <span className="font-medium">
                              {option.agentName} ▸ {option.signalName}
                            </span>
                            <span className="text-sm text-muted-foreground ml-2">
                              ({(option.creditsPerCall / 100).toFixed(2)} credits per usage)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="text"
                              placeholder="Credits"
                              className="w-20"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const creditInput = e.target as HTMLInputElement;
                                  const priceInput = creditInput.parentElement?.querySelector("input:nth-child(2)") as HTMLInputElement;
                                  const creditValue = creditInput.value;
                                  const priceValue = priceInput?.value;
                                  
                                  if (creditValue && /^\d*\.?\d*$/.test(creditValue)) {
                                    const cents = parseCurrencyInput(creditValue);
                                    const price = priceValue && /^\d*\.?\d*$/.test(priceValue) ? parseFloat(priceValue) : undefined;
                                    handleAddAllocation(option, cents, price);
                                    creditInput.value = "";
                                    if (priceInput) priceInput.value = "";
                                  }
                                }
                              }}
                            />
                            <Input
                              type="text"
                              placeholder="Price (optional)"
                              className="w-24"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const priceInput = e.target as HTMLInputElement;
                                  const creditInput = priceInput.parentElement?.querySelector("input:first-child") as HTMLInputElement;
                                  const creditValue = creditInput?.value;
                                  const priceValue = priceInput.value;
                                  
                                  if (creditValue && /^\d*\.?\d*$/.test(creditValue)) {
                                    const cents = parseCurrencyInput(creditValue);
                                    const price = priceValue && /^\d*\.?\d*$/.test(priceValue) ? parseFloat(priceValue) : undefined;
                                    handleAddAllocation(option, cents, price);
                                    creditInput.value = "";
                                    priceInput.value = "";
                                  }
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={(e) => {
                                const parent = e.currentTarget.parentElement;
                                const creditInput = parent?.querySelector("input:first-child") as HTMLInputElement;
                                const priceInput = parent?.querySelector("input:nth-child(2)") as HTMLInputElement;
                                const creditValue = creditInput?.value;
                                const priceValue = priceInput?.value;
                                
                                if (creditValue && /^\d*\.?\d*$/.test(creditValue)) {
                                  const cents = parseCurrencyInput(creditValue);
                                  const price = priceValue && /^\d*\.?\d*$/.test(priceValue) ? parseFloat(priceValue) : undefined;
                                  handleAddAllocation(option, cents, price);
                                  creditInput.value = "";
                                  priceInput.value = "";
                                }
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {searchTerm && filteredOptions.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    No matching credit signals found.
                  </div>
                )}

                {/* Data Grid */}
                {creditAllocations.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-lg">Current Credits</Label>
                      <div className="w-[300px]">
                        <Input
                          placeholder="Search current credits..."
                          value={currentCreditsSearch}
                          onChange={(e) =>
                            setCurrentCreditsSearch(e.target.value)
                          }
                          className="h-9"
                        />
                      </div>
                    </div>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                              {headerGroup.headers.map((header) => (
                                <TableHead key={header.id}>
                                  {header.isPlaceholder
                                    ? null
                                    : flexRender(
                                        header.column.columnDef.header,
                                        header.getContext()
                                      )}
                                </TableHead>
                              ))}
                            </TableRow>
                          ))}
                        </TableHeader>
                        <TableBody>
                          {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                              <TableRow
                                key={row.id}
                                data-state={row.getIsSelected() && "selected"}
                              >
                                {row.getVisibleCells().map((cell) => (
                                  <TableCell key={cell.id}>
                                    {flexRender(
                                      cell.column.columnDef.cell,
                                      cell.getContext()
                                    )}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell
                                colSpan={columns.length}
                                className="h-24 text-center"
                              >
                                No credits added yet.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fee Confirmation Dialog */}
      <AlertDialog open={feeConfirmationOpen} onOpenChange={setFeeConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Agent Linking Fees</AlertDialogTitle>
            <AlertDialogDescription>
              The agent "{pendingAgentInfo?.name}" has fees that will be applied immediately when linking:
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="my-4 space-y-2">
            {pendingAgentInfo?.setupFee && pendingAgentInfo.setupFee > 0 && (
              <div className="flex justify-between">
                <span>Setup Fee (one-time):</span>
                <span className="font-semibold">${pendingAgentInfo.setupFee.toFixed(2)}</span>
              </div>
            )}
            {pendingAgentInfo?.platformFee && pendingAgentInfo.platformFee > 0 && (
              <div className="flex justify-between">
                <span>Platform Fee ({pendingAgentInfo.billingCycle}):</span>
                <span className="font-semibold">${pendingAgentInfo.platformFee.toFixed(2)}</span>
              </div>
            )}
            {pendingAgentInfo && (
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="font-semibold">Total:</span>
                <span className="font-bold">
                  ${((pendingAgentInfo.setupFee || 0) + (pendingAgentInfo.platformFee || 0)).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setFeeConfirmationOpen(false);
                setPendingAgentId(null);
                setPendingAgentInfo(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (pendingAgentId) {
                  await confirmLinkAgent(pendingAgentId, true);
                }
                setFeeConfirmationOpen(false);
                setPendingAgentId(null);
                setPendingAgentInfo(null);
              }}
            >
              Apply Fees & Link Agent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
