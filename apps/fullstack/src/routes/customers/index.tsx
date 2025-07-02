import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
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
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { customerRepository } from "~/lib/customers/customer.repo";

const getCustomers = createServerFn({ method: "GET" }).handler(async () => {
  const customers = await customerRepository.findAll();
  return customers;
});

const deleteCustomer = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await customerRepository.delete(data.id);
    return { success: true };
  });

export const Route = createFileRoute("/customers/")({
  loader: async () => {
    const customers = await getCustomers();
    return { customers };
  },
  component: CustomersPage,
});

function CustomersPage() {
  const { customers } = Route.useLoaderData();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const navigate = Route.useNavigate();

  const handleDelete = async (id: string) => {
    await deleteCustomer({ data: { id } });
    setDeleteId(null);
    navigate({ to: ".", replace: true });
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-slate-600 mt-2">Manage your customer accounts</p>
        </div>
        <Link to="/customers/$customerId" params={{ customerId: "new" }}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Customer
          </Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {customers.map((customer) => (
          <Card key={customer.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{customer.name}</CardTitle>
                  <CardDescription className="mt-2">
                    Slug: {customer.slug}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Link
                    to="/customers/$customerId"
                    params={{ customerId: customer.id }}
                  >
                    <Button variant="outline" size="sm">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteId(customer.id)}
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
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this customer? This action cannot
              be undone.
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
