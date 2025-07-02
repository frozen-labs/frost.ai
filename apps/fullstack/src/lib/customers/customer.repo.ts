import { eq } from "drizzle-orm";
import { Customer, customers, db, NewCustomer } from "~/lib/database";

export const customerRepository = {
  async create(data: NewCustomer): Promise<Customer> {
    const [customer] = await db.insert(customers).values(data).returning();
    return customer;
  },

  async findById(id: string): Promise<Customer | null> {
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);
    return customer || null;
  },

  async findBySlug(slug: string): Promise<Customer | null> {
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.slug, slug))
      .limit(1);
    return customer || null;
  },

  async findAll(): Promise<Customer[]> {
    return await db.select().from(customers);
  },

  async update(
    id: string,
    data: Partial<NewCustomer>
  ): Promise<Customer | null> {
    const [customer] = await db
      .update(customers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return customer || null;
  },

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(customers)
      .where(eq(customers.id, id))
      .returning();
    return result.length > 0;
  },
};
