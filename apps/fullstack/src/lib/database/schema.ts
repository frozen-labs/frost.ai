import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  uuid as pgUuid,
  timestamp,
  uniqueIndex,
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

export const validModels = pgTable(
  "valid_models",
  {
    id: pgUuid("id")
      .primaryKey()
      .$defaultFn(() => uuidV7()),
    modelIdentifier: varchar("model_identifier", { length: 255 })
      .notNull()
      .unique(),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    inputCostPer1kTokensCents: integer(
      "input_cost_per_1k_tokens_cents"
    ).notNull(),
    outputCostPer1kTokensCents: integer(
      "output_cost_per_1k_tokens_cents"
    ).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("valid_models_identifier_unique").on(table.modelIdentifier),
    index("valid_models_is_active_idx").on(table.isActive),
  ]
);

export const tokenUsage = pgTable(
  "token_usage",
  {
    id: pgUuid("id")
      .primaryKey()
      .$defaultFn(() => uuidV7()),
    customerId: pgUuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    agentId: pgUuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    modelId: pgUuid("model_id")
      .notNull()
      .references(() => validModels.id, { onDelete: "restrict" }),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    totalTokens: integer("total_tokens").notNull(),
    inputCost: integer("input_cost").notNull(),
    outputCost: integer("output_cost").notNull(),
    totalCost: integer("total_cost").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("token_usage_customer_idx").on(table.customerId),
    index("token_usage_agent_idx").on(table.agentId),
    index("token_usage_model_idx").on(table.modelId),
    index("token_usage_created_at_idx").on(table.createdAt),
    index("token_usage_customer_created_idx").on(
      table.customerId,
      table.createdAt
    ),
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

export const validModelsRelations = relations(validModels, ({ many }) => ({
  tokenUsages: many(tokenUsage),
}));

export const tokenUsageRelations = relations(tokenUsage, ({ one }) => ({
  customer: one(customers, {
    fields: [tokenUsage.customerId],
    references: [customers.id],
  }),
  agent: one(agents, {
    fields: [tokenUsage.agentId],
    references: [agents.id],
  }),
  model: one(validModels, {
    fields: [tokenUsage.modelId],
    references: [validModels.id],
  }),
}));

// ============================================================================
// ZOD SCHEMAS (for validation)
// ============================================================================

// Insert schemas
export const insertCustomerSchema = createInsertSchema(customers);
export const insertAgentSchema = createInsertSchema(agents);
export const insertAgentSignalSchema = createInsertSchema(agentSignals);
export const insertAgentSignalLogSchema = createInsertSchema(agentSignalLogs);
export const insertValidModelSchema = createInsertSchema(validModels);
export const insertTokenUsageSchema = createInsertSchema(tokenUsage);

// Select schemas
export const selectCustomerSchema = createSelectSchema(customers);
export const selectAgentSchema = createSelectSchema(agents);
export const selectAgentSignalSchema = createSelectSchema(agentSignals);
export const selectAgentSignalLogSchema = createSelectSchema(agentSignalLogs);
export const selectValidModelSchema = createSelectSchema(validModels);
export const selectTokenUsageSchema = createSelectSchema(tokenUsage);

// Types
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type AgentSignal = typeof agentSignals.$inferSelect;
export type NewAgentSignal = typeof agentSignals.$inferInsert;
export type AgentSignalLog = typeof agentSignalLogs.$inferSelect;
export type NewAgentSignalLog = typeof agentSignalLogs.$inferInsert;
export type ValidModel = typeof validModels.$inferSelect;
export type NewValidModel = typeof validModels.$inferInsert;
export type TokenUsage = typeof tokenUsage.$inferSelect;
export type NewTokenUsage = typeof tokenUsage.$inferInsert;
