import { createFileRoute, Link } from "@tanstack/react-router";
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
import { deleteModel, getModels } from "~/lib/metering/model.functions";

export const Route = createFileRoute("/models/")({
  loader: async () => {
    const models = await getModels();
    return { models };
  },
  component: ModelsPage,
});

function ModelsPage() {
  const { models } = Route.useLoaderData();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const navigate = Route.useNavigate();

  const handleDelete = async (id: string) => {
    await deleteModel({ data: { id } });
    setDeleteId(null);
    navigate({ to: ".", replace: true });
  };

  const formatCost = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Models</h1>
          <p className="text-slate-600 mt-2">
            Manage AI models and their pricing
          </p>
        </div>
        <Link to="/models/$modelId" params={{ modelId: "new" }}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Model
          </Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {models.map((model) => (
          <Card key={model.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle>{model.modelIdentifier}</CardTitle>
                  </div>
                  <CardDescription className="space-y-1">
                    <div>
                      Input: {formatCost(model.inputCostPer1MTokensCents)}/1M
                      tokens
                    </div>
                    <div>
                      Output: {formatCost(model.outputCostPer1MTokensCents)}/1M
                      tokens
                    </div>
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Link to="/models/$modelId" params={{ modelId: model.id }}>
                    <Button variant="outline" size="sm">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteId(model.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Model</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this model? This action cannot be
              undone and may affect existing token usage records.
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
