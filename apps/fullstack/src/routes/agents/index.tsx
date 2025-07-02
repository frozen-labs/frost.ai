import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
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
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { deleteAgent } from "~/lib/agents/agent.functions";
import { agentRepository } from "~/lib/agents/agents.repo";
import { type Agent } from "~/lib/database";

const getAgents = createServerFn({ method: "GET" }).handler(async () => {
  return await agentRepository.findAll();
});

export const Route = createFileRoute("/agents/")({
  loader: async () => {
    const agents = await getAgents();
    return { agents };
  },
  component: AgentsPage,
});

interface AgentMetadata {
  isRestricted?: boolean;
  signals?: { name: string; description: string }[];
}

function AgentsPage() {
  const { agents } = Route.useLoaderData();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    await deleteAgent({ data: { agentId: id } });
    setDeleteId(null);
    // Refresh the page after deletion
    window.location.reload();
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Agents</h1>
          <p className="text-slate-600 mt-2">
            Manage your AI agents and their signals
          </p>
        </div>
        <Link to="/agents/$agentId" params={{ agentId: "new" }}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Agent
          </Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {agents.map((agent: Agent) => {
          const metadata = agent.metadata as AgentMetadata | null;
          return (
            <Card key={agent.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{agent.name}</CardTitle>
                    <CardDescription className="mt-2">
                      Slug: {agent.slug}
                      {metadata?.isRestricted && (
                        <>
                          {" | "}
                          <span className="text-orange-600">
                            Restricted Access
                          </span>
                        </>
                      )}
                    </CardDescription>
                    {metadata?.signals && metadata.signals.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-slate-700">
                          Signals:
                        </p>
                        <ul className="mt-2 space-y-1">
                          {metadata.signals.map((signal, index) => (
                            <li key={index} className="text-sm text-slate-600">
                              <span className="font-medium">{signal.name}</span>
                              {signal.description && ` - ${signal.description}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link to="/agents/$agentId" params={{ agentId: agent.id }}>
                      <Button variant="outline" size="sm">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteId(agent.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this agent? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
