// Client-safe database types and constants
// This file contains NO database connections or server imports

// Re-export enum constants (safe for client)
export const SIGNAL_TYPES = {
  USAGE: 'usage',
  OUTCOME: 'outcome', 
  CREDIT: 'credit'
} as const;

export const BILLING_CYCLES = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly'
} as const;

export const FEE_TYPES = {
  SETUP: 'setup',
  PLATFORM: 'platform'
} as const;

export const COST_TYPES = {
  MONETARY: 'monetary',
  CREDIT: 'credit'
} as const;

// Type definitions (safe for client)
export type SignalType = typeof SIGNAL_TYPES[keyof typeof SIGNAL_TYPES];
export type BillingCycle = typeof BILLING_CYCLES[keyof typeof BILLING_CYCLES];
export type FeeType = typeof FEE_TYPES[keyof typeof FEE_TYPES];
export type CostType = typeof COST_TYPES[keyof typeof COST_TYPES];

// Table type definitions (inferred from schema, safe for client)
export type Customer = {
  id: string;
  name: string;
  slug: string;
  metadata?: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Agent = {
  id: string;
  name: string;
  slug: string;
  metadata?: Record<string, any> | null;
  setupFeeEnabled?: boolean | null;
  setupFeeCents?: number | null;
  platformFeeEnabled?: boolean | null;
  platformFeeCents?: number | null;
  platformFeeBillingCycle?: BillingCycle | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AgentSignal = {
  id: string;
  agentId: string;
  name: string;
  slug: string;
  signalType: SignalType;
  pricePerCallCents: number;
  outcomePriceCents: number | null;
  creditsPerCallCents: number | null;
  createdAt: Date;
};