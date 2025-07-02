import { useForm } from "@tanstack/react-form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
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
import { Switch } from "~/components/ui/switch";
import { getModel, saveModel } from "~/lib/metering/model.functions";
import { type ValidModel } from "~/lib/database";

export const Route = createFileRoute("/models/$modelId")({
  loader: async ({ params }) => {
    const model = await getModel({
      data: { modelId: params.modelId },
    });
    return { model };
  },
  component: ModelFormPage,
});

const formSchema = z.object({
  modelIdentifier: z.string().min(1, "Model identifier is required"),
  displayName: z.string().min(1, "Display name is required"),
  inputCostPer1kTokensCents: z.number().min(0, "Input cost must be positive"),
  outputCostPer1kTokensCents: z.number().min(0, "Output cost must be positive"),
  isActive: z.boolean(),
});

function ModelFormPage() {
  const navigate = useNavigate();
  const { modelId } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const model = loaderData.model as ValidModel | null;

  const isNewModel = modelId === "new";

  const form = useForm({
    defaultValues: {
      modelIdentifier: model?.modelIdentifier || "",
      displayName: model?.displayName || "",
      inputCostPer1kTokensCents: model?.inputCostPer1kTokensCents || 0,
      outputCostPer1kTokensCents: model?.outputCostPer1kTokensCents || 0,
      isActive: model?.isActive ?? true,
    },
    validators: {
      onChange: formSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await saveModel({
          data: {
            modelId,
            ...value,
          },
        });

        toast.success(
          isNewModel
            ? "Model created successfully!"
            : "Model updated successfully!"
        );
        navigate({ to: "/models" });
      } catch (error) {
        toast.error(
          isNewModel
            ? "Failed to create model"
            : "Failed to update model"
        );
        console.error("Error saving model:", error);
      }
    },
  });

  const handleCancel = () => {
    navigate({ to: "/models" });
  };

  const formatCentsToDecimal = (cents: number) => {
    return (cents / 100).toFixed(4);
  };

  const parseCentsFromDecimal = (value: string) => {
    const decimal = parseFloat(value);
    return isNaN(decimal) ? 0 : Math.round(decimal * 100);
  };

  return (
    <div className="p-8">
      <Button variant="ghost" onClick={handleCancel} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Models
      </Button>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>
            {isNewModel ? "Create New Model" : "Edit Model"}
          </CardTitle>
          <CardDescription>
            {isNewModel
              ? "Add a new AI model to your system"
              : "Update model information and pricing"}
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
            <form.Field name="modelIdentifier">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Model Identifier</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="gpt-4o, claude-3-5-sonnet, etc."
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-red-600">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="displayName">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Display Name</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="GPT-4o, Claude 3.5 Sonnet, etc."
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-red-600">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="inputCostPer1kTokensCents">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Input Cost per 1K Tokens ($)</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="number"
                    step="0.0001"
                    min="0"
                    value={formatCentsToDecimal(field.state.value)}
                    onChange={(e) => field.handleChange(parseCentsFromDecimal(e.target.value))}
                    onBlur={field.handleBlur}
                    placeholder="0.0030"
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-red-600">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="outputCostPer1kTokensCents">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Output Cost per 1K Tokens ($)</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="number"
                    step="0.0001"
                    min="0"
                    value={formatCentsToDecimal(field.state.value)}
                    onChange={(e) => field.handleChange(parseCentsFromDecimal(e.target.value))}
                    onBlur={field.handleBlur}
                    placeholder="0.0150"
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-red-600">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="isActive">
              {(field) => (
                <div className="flex items-center space-x-2">
                  <Switch
                    id={field.name}
                    checked={field.state.value}
                    onCheckedChange={(checked) => field.handleChange(checked)}
                  />
                  <Label htmlFor={field.name}>Active</Label>
                </div>
              )}
            </form.Field>

            {!isNewModel && model && (
              <div className="space-y-2">
                <Label>Model ID</Label>
                <div className="px-3 py-2 bg-muted rounded-md text-sm font-mono">
                  {model.id}
                </div>
                <p className="text-sm text-muted-foreground">
                  This is the unique model identifier in the database
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
                      : isNewModel
                      ? "Create Model"
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