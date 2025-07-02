import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { type NewCustomer } from "~/lib/database";
import { customerRepository } from "./customer.repo";

export const getCustomer = createServerFn({ method: "GET" })
  .validator(z.object({ customerId: z.string() }))
  .handler(async ({ data }) => {
    if (data.customerId === "new") {
      return null;
    }

    const customer = await customerRepository.findById(data.customerId);
    if (!customer) return null;

    return customer;
  });

const saveCustomerSchema = z.object({
  customerId: z.string(),
  name: z.string().min(1, "Name is required"),
});

export const saveCustomer = createServerFn({ method: "POST" })
  .validator(saveCustomerSchema)
  .handler(async ({ data }) => {
    const customerData: NewCustomer = {
      name: data.name,
    };

    let customerId = data.customerId;

    if (data.customerId === "new") {
      const newCustomer = await customerRepository.create(customerData);
      customerId = newCustomer.id;
    } else {
      await customerRepository.update(data.customerId, customerData);
    }
  });
