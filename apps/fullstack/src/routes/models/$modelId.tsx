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
import { type ValidModel } from "~/lib/database";
import { getModel, saveModel } from "~/lib/metering/model.functions";

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
  inputCostPer1MTokens: z.number().min(0, "Input cost must be positive"),
  outputCostPer1MTokens: z.number().min(0, "Output cost must be positive"),
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
      inputCostPer1MTokens: model ? model.inputCostPer1MTokensCents / 100 : 0,
      outputCostPer1MTokens: model ? model.outputCostPer1MTokensCents / 100 : 0,
    },
    validators: {
      onSubmit: formSchema,
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
          isNewModel ? "Failed to create model" : "Failed to update model"
        );
        console.error("Error saving model:", error);
      }
    },
  });

  const handleCancel = () => {
    navigate({ to: "/models" });
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
                  <p className="text-sm text-muted-foreground">
                    This is the unique model identifier used in the database
                  </p>
                </div>
              )}
            </form.Field>

            <form.Field name="inputCostPer1MTokens">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>
                    Input Cost per 1M Tokens ($)
                  </Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="number"
                    step="0.01"
                    min="0"
                    value={field.state.value}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.handleChange(
                        value === "" ? 0 : parseFloat(value) || 0
                      );
                    }}
                    onBlur={(e) => {
                      const value = e.target.value;
                      if (value === "") {
                        field.handleChange(0);
                      } else {
                        const rounded =
                          Math.round(parseFloat(value) * 100) / 100;
                        field.handleChange(rounded || 0);
                      }
                      field.handleBlur();
                    }}
                    placeholder="0.03"
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-red-600">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="outputCostPer1MTokens">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>
                    Output Cost per 1M Tokens ($)
                  </Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="number"
                    step="0.01"
                    min="0"
                    value={field.state.value}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.handleChange(
                        value === "" ? 0 : parseFloat(value) || 0
                      );
                    }}
                    onBlur={(e) => {
                      const value = e.target.value;
                      if (value === "") {
                        field.handleChange(0);
                      } else {
                        const rounded =
                          Math.round(parseFloat(value) * 100) / 100;
                        field.handleChange(rounded || 0);
                      }
                      field.handleBlur();
                    }}
                    placeholder="0.15"
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
