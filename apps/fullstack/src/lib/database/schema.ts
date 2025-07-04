import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  unique,
  uuid as pgUuid,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { v7 as uuidV7 } from "uuid";

// ============================================================================
// ENUMS
// ============================================================================

// Signal type enum
export const signalTypeEnum = pgEnum('signal_type', ['usage', 'outcome', 'credit']);

// Billing cycle enum  
export const billingCycleEnum = pgEnum('billing_cycle', ['monthly', 'yearly']);

// Fee type enum
export const feeTypeEnum = pgEnum('fee_type', ['setup', 'platform']);

// Import and re-export types for server use
export {
  SIGNAL_TYPES,
  BILLING_CYCLES,
  FEE_TYPES,
  COST_TYPES,
  type SignalType,
  type BillingCycle,
  type FeeType,
  type CostType,
} from './types';

export const customers = pgTable(
  "customers",
  {
    id: pgUuid("id")
      .primaryKey()
      .$defaultFn(() => uuidV7()),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
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
    slug: varchar("slug", {
      length: 255,
    }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    
    // New fee columns
    setupFeeEnabled: boolean("setup_fee_enabled").default(false),
    setupFeeCents: integer("setup_fee_cents").default(0),
    platformFeeEnabled: boolean("platform_fee_enabled").default(false),
    platformFeeCents: integer("platform_fee_cents").default(0),
    platformFeeBillingCycle: billingCycleEnum("platform_fee_billing_cycle").default('monthly'),
    
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
    index("agents_slug_idx").on(table.slug),
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
    slug: varchar("slug", {
      length: 255,
    }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    
    // Signal type and pricing with enum type safety
    signalType: signalTypeEnum("signal_type").default('usage').notNull(),
    pricePerCallCents: integer("price_per_call_cents").default(0).notNull(), // usage
    outcomePriceCents: integer("outcome_price_cents").default(0), // outcome
    creditsPerCallCents: integer("credits_per_call_cents").default(0), // credit
    
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("agent_signals_agent_idx").on(table.agentId),
    index("agent_signals_slug_idx").on(table.slug),
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
    costCents: integer("cost_cents").default(0).notNull(),
    costType: varchar("cost_type", { length: 20 }).default('monetary').notNull(), // 'monetary' or 'credit'
    metadata: jsonb("metadata").$type<Record<string, any>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("agent_signal_logs_agent_signal_idx").on(table.agentSignalId),
    index("agent_signal_logs_customer_idx").on(table.customerId),
    index("agent_signal_logs_cost_type_idx").on(table.costType),
  ]
);

export const validModels = pgTable("valid_models", {
  id: pgUuid("id")
  .primaryKey()
  .$defaultFn(() => uuidV7()),
slug: varchar("slug", { length: 255 }).notNull().unique(),
inputCostPer1MTokensCents: integer(
  "input_cost_per_1m_tokens_cents"
).notNull(),
outputCostPer1MTokensCents: integer(
  "output_cost_per_1m_tokens_cents"
).notNull(),
createdAt: timestamp("created_at", { withTimezone: true })
  .defaultNow()
  .notNull(),
updatedAt: timestamp("updated_at", { withTimezone: true })
  .defaultNow()
  .notNull(),
});

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

// Customer-Agent Links (for restricted agent access)
export const customerAgentLinks = pgTable(
  "customer_agent_links",
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("customer_agent_links_customer_idx").on(table.customerId),
    index("customer_agent_links_agent_idx").on(table.agentId),
    unique("customer_agent_links_unique").on(table.customerId, table.agentId),
  ]
);

// Customer Credit Allocations (for credit-based signals)
export const customerCreditAllocations = pgTable(
  "customer_credit_allocations",
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
    signalId: pgUuid("signal_id")
      .notNull()
      .references(() => agentSignals.id, { onDelete: "cascade" }),
    creditsCents: integer("credits_cents").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("customer_credit_allocations_customer_idx").on(table.customerId),
    index("customer_credit_allocations_agent_idx").on(table.agentId),
    index("customer_credit_allocations_signal_idx").on(table.signalId),
    unique("customer_credit_allocations_unique").on(table.customerId, table.agentId, table.signalId),
  ]
);

// Agent Fee Transactions (for setup and platform fees)
export const agentFeeTransactions = pgTable(
  "agent_fee_transactions",
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
    feeType: feeTypeEnum("fee_type").notNull(),
    amountCents: integer("amount_cents").notNull(),
    billingCycle: billingCycleEnum("billing_cycle"), // null for setup fees
    transactionDate: timestamp("transaction_date", { withTimezone: true })
      .defaultNow()
      .notNull(),
    
    // New billing management fields
    billingAnchorDay: integer("billing_anchor_day"), // 1-31, day of month for recurring billing
    billingTimezone: varchar("billing_timezone", { length: 50 }).default('UTC').notNull(),
    nextBillingDate: timestamp("next_billing_date", { withTimezone: true }), // when to charge next platform fee
    previousTransactionId: pgUuid("previous_transaction_id"), // links to last platform fee payment
    
    // Status field to track active vs historical transactions
    isActive: boolean("is_active").default(true).notNull(),
    
    metadata: jsonb("metadata").$type<Record<string, any>>(),
  },
  (table) => [
    index("agent_fee_transactions_customer_idx").on(table.customerId),
    index("agent_fee_transactions_agent_idx").on(table.agentId),
    index("agent_fee_transactions_type_idx").on(table.feeType),
    index("agent_fee_transactions_date_idx").on(table.transactionDate),
    index("agent_fee_transactions_next_billing_idx").on(table.nextBillingDate),
    // Removed unique constraint to allow renewal transactions with audit trail
    // The shouldChargePlatformFee logic prevents duplicate charges by checking nextBillingDate
  ]
);

// Credit Purchases (for tracking credit sales revenue)
export const creditPurchases = pgTable(
  "credit_purchases",
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
    signalId: pgUuid("signal_id")
      .notNull()
      .references(() => agentSignals.id, { onDelete: "cascade" }),
    creditAmountCents: integer("credit_amount_cents").notNull(),
    pricePaidCents: integer("price_paid_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("credit_purchases_customer_idx").on(table.customerId),
    index("credit_purchases_agent_idx").on(table.agentId),
    index("credit_purchases_created_idx").on(table.createdAt),
  ]
);

// ============================================================================
// RELATIONS
// ============================================================================

export const customersRelations = relations(customers, () => ({}));

export const agentsRelations = relations(agents, () => ({}));

export const agentSignalsRelations = relations(agentSignals, ({ one, many }) => ({
  agent: one(agents, {
    fields: [agentSignals.agentId],
    references: [agents.id],
  }),
  creditAllocations: many(customerCreditAllocations),
  creditPurchases: many(creditPurchases),
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


// New table relations
export const customerAgentLinksRelations = relations(customerAgentLinks, ({ one }) => ({
  customer: one(customers, {
    fields: [customerAgentLinks.customerId],
    references: [customers.id],
  }),
  agent: one(agents, {
    fields: [customerAgentLinks.agentId],
    references: [agents.id],
  }),
}));

export const customerCreditAllocationsRelations = relations(customerCreditAllocations, ({ one }) => ({
  customer: one(customers, {
    fields: [customerCreditAllocations.customerId],
    references: [customers.id],
  }),
  agent: one(agents, {
    fields: [customerCreditAllocations.agentId],
    references: [agents.id],
  }),
  signal: one(agentSignals, {
    fields: [customerCreditAllocations.signalId],
    references: [agentSignals.id],
  }),
}));

export const agentFeeTransactionsRelations = relations(agentFeeTransactions, ({ one }) => ({
  customer: one(customers, {
    fields: [agentFeeTransactions.customerId],
    references: [customers.id],
  }),
  agent: one(agents, {
    fields: [agentFeeTransactions.agentId],
    references: [agents.id],
  }),
}));

export const creditPurchasesRelations = relations(creditPurchases, ({ one }) => ({
  customer: one(customers, {
    fields: [creditPurchases.customerId],
    references: [customers.id],
  }),
  agent: one(agents, {
    fields: [creditPurchases.agentId],
    references: [agents.id],
  }),
  signal: one(agentSignals, {
    fields: [creditPurchases.signalId],
    references: [agentSignals.id],
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
export type CustomerAgentLink = typeof customerAgentLinks.$inferSelect;
export type NewCustomerAgentLink = typeof customerAgentLinks.$inferInsert;
export type CustomerCreditAllocation = typeof customerCreditAllocations.$inferSelect;
export type NewCustomerCreditAllocation = typeof customerCreditAllocations.$inferInsert;
export type AgentFeeTransaction = typeof agentFeeTransactions.$inferSelect;
export type NewAgentFeeTransaction = typeof agentFeeTransactions.$inferInsert;
export type CreditPurchase = typeof creditPurchases.$inferSelect;
export type NewCreditPurchase = typeof creditPurchases.$inferInsert;
