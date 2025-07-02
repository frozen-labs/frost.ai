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
import { getCustomer, saveCustomer } from "~/lib/customers/customer.functions";
import { type Customer } from "~/lib/database";

export const Route = createFileRoute("/customers/$customerId")({
  loader: async ({ params }) => {
    const customer = await getCustomer({
      data: { customerId: params.customerId },
    });
    return { customer };
  },
  component: CustomerFormPage,
});

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  customerSlug: z.string().min(1, "Slug is required"),
});

function CustomerFormPage() {
  const navigate = useNavigate();
  const { customerId } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const customer = loaderData.customer as Customer | null;

  const isNewCustomer = customerId === "new";

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
        await saveCustomer({
          data: {
            customerId,
            name: value.name,
            slug: value.customerSlug,
          },
        });

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
                  This is the unique customer ID
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
    </div>
  );
}
