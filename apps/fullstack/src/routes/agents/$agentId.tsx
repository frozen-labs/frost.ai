import { useForm } from "@tanstack/react-form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Plus, X, Edit2, Check } from "lucide-react";
import { toast } from "sonner";
import { formatCurrencyInput, parseCurrencyInput, formatCurrency } from "~/lib/utils/currency";
import { useEffect, useState } from "react";
import { z } from "zod";
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
import { getAgent, saveAgent } from "~/lib/agents/agent.functions";
import { AgentSignal, type Agent } from "~/lib/database";

export const Route = createFileRoute("/agents/$agentId")({
  loader: async ({ params }) => {
    const agent = await getAgent({
      data: { agentId: params.agentId },
    });
    return { agent };
  },
  component: AgentFormPage,
});

type SignalForm = {
  id?: string;
  name: string;
  friendlySignalIdentifier: string;
  pricePerCallCents: number;
};

type SignalCardProps = {
  signal: SignalForm;
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (signal: Partial<SignalForm>) => void;
  onCancel: () => void;
  onRemove: () => void;
  computeFriendlyIdentifier: (name: string) => string;
};

function SignalCard({ 
  signal, 
  isEditing, 
  onEdit, 
  onSave, 
  onCancel, 
  onRemove,
  computeFriendlyIdentifier 
}: SignalCardProps) {
  const [editName, setEditName] = useState(signal.name);
  const [editPriceRaw, setEditPriceRaw] = useState("");
  const [editPriceCents, setEditPriceCents] = useState(signal.pricePerCallCents);

  // Initialize raw price when signal changes or editing starts
  useEffect(() => {
    if (isEditing && signal.pricePerCallCents > 0) {
      setEditPriceRaw(formatCurrencyInput(signal.pricePerCallCents));
    } else if (isEditing) {
      setEditPriceRaw("");
    }
    setEditPriceCents(signal.pricePerCallCents);
  }, [isEditing, signal.pricePerCallCents]);

  const handleSave = () => {
    // Parse the raw string into cents when saving
    const cents = parseCurrencyInput(editPriceRaw);
    onSave({
      name: editName,
      friendlySignalIdentifier: computeFriendlyIdentifier(editName),
      pricePerCallCents: cents,
    });
  };

  const handleCancel = () => {
    setEditName(signal.name);
    setEditPriceRaw(signal.pricePerCallCents > 0 ? formatCurrencyInput(signal.pricePerCallCents) : "");
    setEditPriceCents(signal.pricePerCallCents);
    onCancel();
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 p-3 border rounded-lg">
        <div className="flex-1 space-y-2">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Signal name"
          />
          <Input
            type="text"
            value={editPriceRaw}
            onChange={(e) => {
              const value = e.target.value;
              // Allow only numbers and decimal point
              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                setEditPriceRaw(value);
              }
            }}
            onBlur={() => {
              // Optional: format the raw input on blur for better UX
              if (editPriceRaw) {
                const cents = parseCurrencyInput(editPriceRaw);
                setEditPriceCents(cents);
                setEditPriceRaw(formatCurrencyInput(cents));
              }
            }}
            placeholder="Price in USD"
          />
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSave}
            disabled={!editName.trim()}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div>
        <p className="font-medium">{signal.name}</p>
        <p className="text-sm text-muted-foreground">
          ID: {signal.friendlySignalIdentifier}
        </p>
        <p className="text-sm text-muted-foreground">
          Price: {formatCurrency(signal.pricePerCallCents)} per call
        </p>
      </div>
      <div className="flex gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEdit}
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  friendlyAgentIdentifier: z.string().min(1, "Identifier is required"),
});

function AgentFormPage() {
  const navigate = useNavigate();
  const { agentId } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const agent = loaderData.agent as Agent | null;

  const isNewAgent = agentId === "new";

  const [signals, setSignals] = useState<SignalForm[]>([]);
  const [newSignalName, setNewSignalName] = useState("");
  const [newSignalPriceRaw, setNewSignalPriceRaw] = useState("");
  const [newSignalPriceCents, setNewSignalPriceCents] = useState(0);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (loaderData.agent?.signals) {
      const existingSignals = loaderData.agent.signals.map(
        (signal: AgentSignal) => ({
          id: signal.id,
          name: signal.name,
          friendlySignalIdentifier: signal.friendlySignalIdentifier,
          pricePerCallCents: signal.pricePerCallCents || 0,
        })
      );
      setSignals(existingSignals);
    } else {
      setSignals([]);
    }
    // Reset editing state when switching agents
    setEditingIndex(null);
  }, [loaderData.agent]);

  const form = useForm({
    defaultValues: {
      name: agent?.name || "",
      friendlyAgentIdentifier: agent?.friendlyAgentIdentifier || "",
    },
    validators: {
      onChange: formSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await saveAgent({
          data: {
            agentId,
            name: value.name,
            friendlyAgentIdentifier: value.friendlyAgentIdentifier,
            signals,
          },
        });

        toast.success(isNewAgent ? "Agent created successfully!" : "Agent updated successfully!");
        navigate({ to: "/agents" });
      } catch (error) {
        toast.error(isNewAgent ? "Failed to create agent" : "Failed to update agent");
        console.error("Error saving agent:", error);
      }
    },
  });

  // Compute friendly agent identifier from name
  const computeFriendlyIdentifier = (inputName: string) => {
    return inputName.toLowerCase().replace(/\s+/g, "-");
  };

  const handleCancel = () => {
    navigate({ to: "/agents" });
  };

  const handleAddSignal = () => {
    if (newSignalName.trim()) {
      // Parse the raw string into cents when adding the signal
      const cents = parseCurrencyInput(newSignalPriceRaw);
      const newSignal = {
        name: newSignalName,
        friendlySignalIdentifier: computeFriendlyIdentifier(newSignalName),
        pricePerCallCents: cents,
      };
      setSignals((prev) => [...prev, newSignal]);
      setNewSignalName("");
      setNewSignalPriceRaw("");
      setNewSignalPriceCents(0);
    }
  };

  const handleRemoveSignal = (index: number) => {
    setSignals((prev) => prev.filter((_, i) => i !== index));
    setEditingIndex(null);
  };

  const handleEditSignal = (index: number) => {
    setEditingIndex(index);
  };

  const handleSaveSignal = (index: number, updatedSignal: Partial<SignalForm>) => {
    setSignals((prev) => prev.map((signal, i) => 
      i === index ? { ...signal, ...updatedSignal } : signal
    ));
    setEditingIndex(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
  };

  return (
    <div className="p-8">
      <Button variant="ghost" onClick={handleCancel} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Agents
      </Button>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>
            {isNewAgent ? "Create New Agent" : "Edit Agent"}
          </CardTitle>
          <CardDescription>
            {isNewAgent
              ? "Add a new AI agent to your system"
              : "Update agent information"}
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
                  <Label htmlFor={field.name}>Agent Name</Label>
                  <p className="text-sm text-muted-foreground">
                    Give your agent a descriptive name. This will be used to
                    auto-generate a unique Agent ID.
                  </p>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="e.g., Customer Support Bot, Data Analytics Agent"
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
                const computedIdentifier = computeFriendlyIdentifier(name);
                return (
                  <form.Field name="friendlyAgentIdentifier">
                    {(field) => {
                      // Update the field value when the computed identifier changes
                      if (field.state.value !== computedIdentifier) {
                        field.handleChange(computedIdentifier);
                      }
                      return (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>Agent Identifier</Label>
                          <p className="text-sm text-muted-foreground">
                            This identifier is used to identify the agent in the
                            API. It's automatically computed from the agent
                            name.
                          </p>
                          <Input
                            id={field.name}
                            name={field.name}
                            value={computedIdentifier}
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

            <div className="space-y-4">
              <div>
                <Label>Signals</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Add monitoring signals to track specific metrics or events for
                  this agent. Each signal should have a clear name and
                  description of what it monitors.
                </p>
              </div>

              {signals.length > 0 && (
                <div className="space-y-2">
                  {signals.map((signal, index) => (
                    <SignalCard
                      key={index}
                      signal={signal}
                      index={index}
                      isEditing={editingIndex === index}
                      onEdit={() => handleEditSignal(index)}
                      onSave={(updatedSignal) => handleSaveSignal(index, updatedSignal)}
                      onCancel={handleCancelEdit}
                      onRemove={() => handleRemoveSignal(index)}
                      computeFriendlyIdentifier={computeFriendlyIdentifier}
                    />
                  ))}
                </div>
              )}

              <div className="space-y-3 border p-4 rounded-lg">
                <Input
                  value={newSignalName}
                  onChange={(e) => setNewSignalName(e.target.value)}
                  placeholder="Signal name"
                />
                <Input
                  type="text"
                  value={newSignalPriceRaw}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow only numbers and decimal point
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setNewSignalPriceRaw(value);
                    }
                  }}
                  onBlur={() => {
                    // Optional: format the raw input on blur for better UX
                    if (newSignalPriceRaw) {
                      const cents = parseCurrencyInput(newSignalPriceRaw);
                      setNewSignalPriceCents(cents);
                      setNewSignalPriceRaw(formatCurrencyInput(cents));
                    }
                  }}
                  placeholder="Price in USD"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddSignal}
                  disabled={!newSignalName.trim()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Signal
                </Button>
              </div>
            </div>

            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <div className="flex gap-4">
                  <Button type="submit" disabled={!canSubmit}>
                    {isSubmitting
                      ? "..."
                      : isNewAgent
                        ? "Create Agent"
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
    </div>
  );
}
