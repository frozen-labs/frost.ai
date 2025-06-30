import { json } from "@tanstack/react-start";
import { createServerFileRoute } from "@tanstack/react-start/server";
import { customerRepository } from "~/lib/customers";
import { insertCustomerSchema } from "~/lib/database";

export const ServerRoute = createServerFileRoute("/api/customers/").methods({
  POST: async ({ request }) => {
    try {
      const body = await request.json();

      const validated = await insertCustomerSchema.parseAsync(body);

      const customer = await customerRepository.create(validated);
      return json(customer, { status: 201 });
    } catch (error) {
      console.error("Error creating customer:", error);
      return json({ error: "Internal server error" }, { status: 500 });
    }
  },
});
