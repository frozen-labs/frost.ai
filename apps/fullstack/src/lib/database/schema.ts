import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  uuid as pgUuid,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { v7 as uuidV7 } from "uuid";

export const customers = pgTable(
  "customers",
  {
    id: pgUuid("id")
      .primaryKey()
      .$defaultFn(() => uuidV7()),
    name: varchar("name", { length: 255 }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, any>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("customers_name_idx").on(table.name)]
);

export const agents = pgTable(
  "agents",
  {
    id: pgUuid("id")
      .primaryKey()
      .$defaultFn(() => uuidV7()),
    friendlyAgentIdentifier: varchar("friendly_agent_identifier", {
      length: 255,
    }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, any>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("agents_name_idx").on(table.name),
    index("agents_friendly_agent_identifier_idx").on(
      table.friendlyAgentIdentifier
    ),
  ]
);

export const agentSignals = pgTable(
  "agent_signals",
  {
    id: pgUuid("id")
      .primaryKey()
      .$defaultFn(() => uuidV7()),
    agentId: pgUuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    friendlySignalIdentifier: varchar("friendly_signal_identifier", {
      length: 255,
    }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    pricePerCallCents: integer("price_per_call_cents").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("agent_signals_agent_idx").on(table.agentId),
    index("agent_signals_signal_idx").on(table.friendlySignalIdentifier),
  ]
);

export const agentSignalLogs = pgTable(
  "agent_signal_logs",
  {
    id: pgUuid("id")
      .primaryKey()
      .$defaultFn(() => uuidV7()),
    agentSignalId: pgUuid("agent_signal_id")
      .notNull()
      .references(() => agentSignals.id, { onDelete: "cascade" }),
    customerId: pgUuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    metadata: jsonb("metadata").$type<Record<string, any>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("agent_signal_logs_agent_signal_idx").on(table.agentSignalId),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const customersRelations = relations(customers, () => ({}));

export const agentsRelations = relations(agents, () => ({}));

export const agentSignalsRelations = relations(agentSignals, ({ one }) => ({
  agent: one(agents, {
    fields: [agentSignals.agentId],
    references: [agents.id],
  }),
}));

export const agentSignalLogsRelations = relations(
  agentSignalLogs,
  ({ one }) => ({
    agentSignal: one(agentSignals, {
      fields: [agentSignalLogs.agentSignalId],
      references: [agentSignals.id],
    }),
    customer: one(customers, {
      fields: [agentSignalLogs.customerId],
      references: [customers.id],
    }),
  })
);

// ============================================================================
// ZOD SCHEMAS (for validation)
// ============================================================================

// Insert schemas
export const insertCustomerSchema = createInsertSchema(customers);
export const insertAgentSchema = createInsertSchema(agents);
export const insertAgentSignalSchema = createInsertSchema(agentSignals);
export const insertAgentSignalLogSchema = createInsertSchema(agentSignalLogs);

// Select schemas
export const selectCustomerSchema = createSelectSchema(customers);
export const selectAgentSchema = createSelectSchema(agents);
export const selectAgentSignalSchema = createSelectSchema(agentSignals);
export const selectAgentSignalLogSchema = createSelectSchema(agentSignalLogs);

// Types
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type AgentSignal = typeof agentSignals.$inferSelect;
export type NewAgentSignal = typeof agentSignals.$inferInsert;
export type AgentSignalLog = typeof agentSignalLogs.$inferSelect;
export type NewAgentSignalLog = typeof agentSignalLogs.$inferInsert;
