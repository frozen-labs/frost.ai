# AI Token Tracking Implementation Plan

## Project Overview

Extend Frost AI billing platform to support comprehensive LLM token tracking and cost calculation for customers running AI workloads on their servers.

## Current State Analysis

- **Platform**: Billing infrastructure for AI companies
- **Current Model**: Per-call pricing (`pricePerCallCents`)
- **Architecture**: PostgreSQL + Drizzle ORM + TypeScript
- **API**: Signal tracking endpoint at `/api/signals/track`
- **Analytics**: Comprehensive cost reporting and analytics

## Requirements

- Database migrations are done via the `pnpm run db:push` command, not the `pnpm run db:migrate` command. We directly use the `drizzle-kit` CLI tool to push changes to the database.
- You are allowed to break the existing API, Logic and Database schema, as we will migrate to the new API in a future release.

## Implementation Phases

### Phase 1: Database Schema & Core Infrastructure (Week 1-2)

#### 1.1 Database Migrations

- [ ] Create migration for `llm_usage_logs` table
- [ ] Add token pricing columns to `agent_signals` table
- [ ] Add calculated cost fields to `agent_signal_logs` table
- [ ] Create appropriate indexes for performance

#### 1.2 Schema Updates (schema.ts)

- [ ] Define `llmUsageLogs` table schema
- [ ] Extend `agentSignals` with token pricing fields
- [ ] Extend `agentSignalLogs` with cost calculation fields
- [ ] Add TypeScript types and Zod schemas
- [ ] Update table relations

#### 1.3 Core Types & Interfaces

- [ ] Create `LLMUsage` interface
- [ ] Create `TokenPricing` interface
- [ ] Create `CostCalculation` interface
- [ ] Add provider/model enums
- [ ] Create pricing model enum

**Deliverables:**

- Database migration files
- Updated schema.ts with new tables and relations
- Core TypeScript interfaces and types

### Phase 2: API Extensions & Cost Calculation (Week 3-4)

#### 2.1 Enhanced Tracking API

- [ ] Extend `/api/signals/track` to accept `llmUsage` parameter
- [ ] Add validation for LLM usage data
- [ ] Add error handling for invalid token data

#### 2.2 Cost Calculation Engine

- [ ] Implement `CostCalculator` interface
- [ ] Support per-call pricing (existing)
- [ ] Support per-token pricing (new)
- [ ] Support hybrid pricing model
- [ ] Add cost breakdown by token type

#### 2.3 Data Storage Logic

- [ ] Store LLM usage in `llm_usage_logs` table
- [ ] Calculate and store costs in `agent_signal_logs`
- [ ] Handle missing/optional token data gracefully
- [ ] Store raw provider responses for auditing

**Deliverables:**

- Enhanced tracking API endpoint
- Cost calculation engine with all pricing models
- Database insertion logic for LLM usage data

### Phase 3: Management UI & Configuration (Week 5-6)

#### 3.1 Agent Signal Management

- [ ] Add pricing model selection (per-call/per-token/hybrid)
- [ ] Add token pricing configuration UI
- [ ] Add provider/model selection
- [ ] Update existing signal management forms

#### 3.2 Token Pricing Configuration

- [ ] UI for input token pricing
- [ ] UI for output token pricing
- [ ] UI for cached token pricing
- [ ] UI for reasoning token pricing
- [ ] UI for audio/image token pricing

#### 3.3 Validation & Testing

- [ ] Add form validation for token pricing
- [ ] Test pricing model switching
- [ ] Test backward compatibility
- [ ] Add integration tests for new UI

**Deliverables:**

- Updated agent/signal management UI
- Token pricing configuration interface
- Form validation and error handling

### Phase 4: Analytics & Reporting (Week 7-8)

#### 4.1 Token Usage Analytics

- [ ] Token usage by customer/time period
- [ ] Token usage by provider/model
- [ ] Cost breakdown by token type
- [ ] Token efficiency metrics

#### 4.2 Enhanced Dashboards

- [ ] Token usage trend charts
- [ ] Cost per token analysis
- [ ] Model comparison analytics
- [ ] Provider cost comparison

#### 4.3 Cost Optimization Features

- [ ] Usage pattern analysis
- [ ] Cost optimization recommendations
- [ ] Model efficiency comparisons
- [ ] Caching effectiveness metrics

**Deliverables:**

- Token usage analytics repository
- Enhanced dashboard with token metrics
- Cost optimization reporting features

### Phase 5: Advanced Features (Week 9-10)

#### 5.1 Usage Monitoring

- [ ] Usage quotas per customer
- [ ] Rate limiting based on token consumption
- [ ] Cost alerts and notifications
- [ ] Budget management features

#### 5.2 Customer Features

- [ ] Customer credit/balance system
- [ ] Usage forecasting
- [ ] Self-service usage monitoring
- [ ] Export features for usage data

#### 5.3 Performance & Optimization

- [ ] Query optimization for large datasets
- [ ] Data archiving strategy
- [ ] Caching for frequently accessed data
- [ ] Performance monitoring

**Deliverables:**

- Usage monitoring and alerting system
- Customer self-service features
- Performance optimizations

## Technical Specifications

### Database Schema Design

#### New Table: `llm_usage_logs`

```sql
CREATE TABLE llm_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  agent_signal_log_id UUID NOT NULL REFERENCES agent_signal_logs(id) ON DELETE CASCADE,

  -- Provider & Model Info
  provider VARCHAR(50) NOT NULL, -- 'openai', 'anthropic', 'google', etc.
  model VARCHAR(100) NOT NULL,   -- 'gpt-4', 'claude-3-opus', etc.

  -- Token Usage (following OpenAI standard + extensions)
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cached_tokens INTEGER DEFAULT 0,
  reasoning_tokens INTEGER DEFAULT 0,
  audio_tokens INTEGER DEFAULT 0,
  image_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER GENERATED ALWAYS AS (
    input_tokens + output_tokens + cached_tokens +
    reasoning_tokens + audio_tokens + image_tokens
  ) STORED,

  -- Cost Breakdown
  input_cost_cents INTEGER DEFAULT 0,
  output_cost_cents INTEGER DEFAULT 0,
  cached_cost_cents INTEGER DEFAULT 0,
  reasoning_cost_cents INTEGER DEFAULT 0,
  audio_cost_cents INTEGER DEFAULT 0,
  image_cost_cents INTEGER DEFAULT 0,
  total_cost_cents INTEGER GENERATED ALWAYS AS (
    input_cost_cents + output_cost_cents + cached_cost_cents +
    reasoning_cost_cents + audio_cost_cents + image_cost_cents
  ) STORED,

  -- Raw provider response for auditing
  raw_usage_data JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX llm_usage_logs_agent_signal_log_idx ON llm_usage_logs(agent_signal_log_id);
CREATE INDEX llm_usage_logs_provider_model_idx ON llm_usage_logs(provider, model);
CREATE INDEX llm_usage_logs_created_at_idx ON llm_usage_logs(created_at);
```

#### Extensions to `agent_signals` Table

```sql
ALTER TABLE agent_signals ADD COLUMN pricing_model VARCHAR(20) DEFAULT 'per_call'
  CHECK (pricing_model IN ('per_call', 'per_token', 'hybrid'));

-- Token-based pricing (all in cents, using DECIMAL for precision)
ALTER TABLE agent_signals ADD COLUMN input_token_price_cents DECIMAL(10,4) DEFAULT 0;
ALTER TABLE agent_signals ADD COLUMN output_token_price_cents DECIMAL(10,4) DEFAULT 0;
ALTER TABLE agent_signals ADD COLUMN cached_token_price_cents DECIMAL(10,4) DEFAULT 0;
ALTER TABLE agent_signals ADD COLUMN reasoning_token_price_cents DECIMAL(10,4) DEFAULT 0;
ALTER TABLE agent_signals ADD COLUMN audio_token_price_cents DECIMAL(10,4) DEFAULT 0;
ALTER TABLE agent_signals ADD COLUMN image_token_price_cents DECIMAL(10,4) DEFAULT 0;

-- Provider-specific settings
ALTER TABLE agent_signals ADD COLUMN supported_providers JSONB DEFAULT '["openai", "anthropic", "google"]';
ALTER TABLE agent_signals ADD COLUMN default_model VARCHAR(100);
```

#### Extensions to `agent_signal_logs` Table

```sql
ALTER TABLE agent_signal_logs ADD COLUMN calculated_cost_cents INTEGER DEFAULT 0;
ALTER TABLE agent_signal_logs ADD COLUMN has_llm_usage BOOLEAN DEFAULT FALSE;
```

### API Design

#### Enhanced Tracking Endpoint

```typescript
POST /api/signals/track
{
  // Existing fields (backward compatible)
  "customerId": "customer-uuid",
  "agentId": "agent-friendly-id",
  "signalId": "signal-friendly-id",
  "metadata": {},

  // NEW: LLM Usage Data (optional for backward compatibility)
  "llmUsage": {
    "provider": "openai",
    "model": "gpt-4-turbo",
    "usage": {
      "prompt_tokens": 150,
      "completion_tokens": 75,
      "total_tokens": 225,
      "prompt_tokens_details": {
        "cached_tokens": 50
      },
      "completion_tokens_details": {
        "reasoning_tokens": 25
      }
    },
    "cost": {
      "total_cost": 0.008325,
      "input_cost": 0.0045,
      "output_cost": 0.00375,
      "cached_cost": 0.0005
    },
    "raw_response": { /* original provider response */ }
  }
}
```

### Cost Calculation Logic

#### Core Interfaces

```typescript
interface LLMUsage {
  provider: string;
  model: string;
  usage: {
    prompt_tokens?: number;
    completion_tokens?: number;
    cached_tokens?: number;
    reasoning_tokens?: number;
    audio_tokens?: number;
    image_tokens?: number;
    total_tokens?: number;
    prompt_tokens_details?: Record<string, number>;
    completion_tokens_details?: Record<string, number>;
  };
  cost?: {
    total_cost?: number;
    input_cost?: number;
    output_cost?: number;
    cached_cost?: number;
    reasoning_cost?: number;
    audio_cost?: number;
    image_cost?: number;
  };
  raw_response?: Record<string, any>;
}

interface CostBreakdown {
  inputCostCents: number;
  outputCostCents: number;
  cachedCostCents: number;
  reasoningCostCents: number;
  audioCostCents: number;
  imageCostCents: number;
  totalCostCents: number;
}

interface CostCalculator {
  calculateCost(signal: AgentSignal, usage: LLMUsage): CostBreakdown;
}

enum PricingModel {
  PER_CALL = "per_call",
  PER_TOKEN = "per_token",
  HYBRID = "hybrid",
}
```

#### Implementation

```typescript
class FrostCostCalculator implements CostCalculator {
  calculateCost(signal: AgentSignal, usage: LLMUsage): CostBreakdown {
    switch (signal.pricingModel) {
      case PricingModel.PER_CALL:
        return this.calculatePerCallCost(signal);

      case PricingModel.PER_TOKEN:
        return this.calculatePerTokenCost(signal, usage);

      case PricingModel.HYBRID:
        return this.calculateHybridCost(signal, usage);

      default:
        throw new Error(`Unsupported pricing model: ${signal.pricingModel}`);
    }
  }

  private calculatePerCallCost(signal: AgentSignal): CostBreakdown {
    return {
      inputCostCents: 0,
      outputCostCents: 0,
      cachedCostCents: 0,
      reasoningCostCents: 0,
      audioCostCents: 0,
      imageCostCents: 0,
      totalCostCents: signal.pricePerCallCents,
    };
  }

  private calculatePerTokenCost(
    signal: AgentSignal,
    usage: LLMUsage
  ): CostBreakdown {
    const inputCost =
      (usage.usage.prompt_tokens || 0) * (signal.inputTokenPriceCents || 0);
    const outputCost =
      (usage.usage.completion_tokens || 0) *
      (signal.outputTokenPriceCents || 0);
    const cachedCost =
      (usage.usage.cached_tokens || 0) * (signal.cachedTokenPriceCents || 0);
    const reasoningCost =
      (usage.usage.reasoning_tokens || 0) *
      (signal.reasoningTokenPriceCents || 0);
    const audioCost =
      (usage.usage.audio_tokens || 0) * (signal.audioTokenPriceCents || 0);
    const imageCost =
      (usage.usage.image_tokens || 0) * (signal.imageTokenPriceCents || 0);

    return {
      inputCostCents: Math.round(inputCost),
      outputCostCents: Math.round(outputCost),
      cachedCostCents: Math.round(cachedCost),
      reasoningCostCents: Math.round(reasoningCost),
      audioCostCents: Math.round(audioCost),
      imageCostCents: Math.round(imageCost),
      totalCostCents: Math.round(
        inputCost +
          outputCost +
          cachedCost +
          reasoningCost +
          audioCost +
          imageCost
      ),
    };
  }

  private calculateHybridCost(
    signal: AgentSignal,
    usage: LLMUsage
  ): CostBreakdown {
    const tokenCosts = this.calculatePerTokenCost(signal, usage);
    const baseCost = signal.pricePerCallCents || 0;

    return {
      ...tokenCosts,
      totalCostCents: tokenCosts.totalCostCents + baseCost,
    };
  }
}
```

### Analytics Queries

#### Token Usage Analytics

```sql
-- Token usage by customer over time
SELECT
  c.name,
  DATE_TRUNC('day', lul.created_at) as day,
  SUM(lul.total_tokens) as total_tokens,
  SUM(lul.total_cost_cents) as total_cost_cents,
  lul.provider,
  lul.model
FROM llm_usage_logs lul
JOIN agent_signal_logs asl ON lul.agent_signal_log_id = asl.id
JOIN customers c ON asl.customer_id = c.id
WHERE lul.created_at >= NOW() - INTERVAL '30 days'
GROUP BY c.name, day, lul.provider, lul.model
ORDER BY day DESC, total_cost_cents DESC;

-- Cost breakdown by token type
SELECT
  c.name,
  SUM(lul.input_cost_cents) as input_cost,
  SUM(lul.output_cost_cents) as output_cost,
  SUM(lul.cached_cost_cents) as cached_cost,
  SUM(lul.reasoning_cost_cents) as reasoning_cost,
  SUM(lul.total_cost_cents) as total_cost
FROM llm_usage_logs lul
JOIN agent_signal_logs asl ON lul.agent_signal_log_id = asl.id
JOIN customers c ON asl.customer_id = c.id
WHERE lul.created_at >= NOW() - INTERVAL '30 days'
GROUP BY c.name
ORDER BY total_cost DESC;

-- Model efficiency comparison
SELECT
  lul.provider,
  lul.model,
  AVG(lul.total_cost_cents::DECIMAL / NULLIF(lul.total_tokens, 0)) as avg_cost_per_token,
  SUM(lul.total_tokens) as total_tokens,
  SUM(lul.total_cost_cents) as total_cost,
  COUNT(*) as request_count
FROM llm_usage_logs lul
WHERE lul.created_at >= NOW() - INTERVAL '7 days'
GROUP BY lul.provider, lul.model
HAVING COUNT(*) >= 10
ORDER BY avg_cost_per_token ASC;
```

## Risk Assessment & Mitigation

### Technical Risks

- **Database Performance**: Large token datasets may impact query performance
  - _Mitigation_: Implement proper indexing, data partitioning, and archiving strategy
- **Backward Compatibility**: Breaking existing API consumers
  - _Mitigation_: Make all new fields optional, maintain strict API versioning
- **Data Integrity**: Token counts must match provider responses
  - _Mitigation_: Store raw provider responses, implement validation checks

### Business Risks

- **Customer Migration**: Existing customers need to migrate to new pricing
  - _Mitigation_: Support both models simultaneously, provide migration tools
- **Billing Accuracy**: Token-based billing must be precise
  - _Mitigation_: Implement comprehensive testing, audit trails, and reconciliation
- **Scalability**: High-volume customers may generate large amounts of token data
  - _Mitigation_: Implement data retention policies and performance monitoring

### Security Risks

- **Sensitive Data**: Raw LLM responses may contain sensitive information
  - _Mitigation_: Implement data sanitization, encryption at rest, access controls
- **API Security**: New endpoints need proper authentication
  - _Mitigation_: Use existing authentication patterns, implement rate limiting

## Testing Strategy

### Unit Tests

- [ ] Cost calculation engine for all pricing models
- [ ] API validation for LLM usage data
- [ ] Database insertion/retrieval logic
- [ ] Currency conversion utilities
- [ ] Token count validation

### Integration Tests

- [ ] End-to-end signal tracking with token data
- [ ] Database migrations and schema changes
- [ ] API backward compatibility
- [ ] Analytics query performance
- [ ] Cost calculation accuracy

### Performance Tests

- [ ] Database performance with large token datasets
- [ ] API response times under load
- [ ] Analytics query performance
- [ ] Memory usage with large payloads

### User Acceptance Testing

- [ ] Agent/signal management UI with new features
- [ ] Cost calculation accuracy verification
- [ ] Dashboard analytics and reporting
- [ ] Customer billing accuracy
- [ ] Migration path for existing customers

## Success Metrics

### Technical Metrics

- API response time < 200ms (existing performance maintained)
- Database query performance within acceptable limits (< 2s for analytics)
- Zero breaking changes for existing API consumers
- 99.9% uptime during migration
- Memory usage increase < 20%

### Business Metrics

- 100% backward compatibility with existing customers
- Accurate cost calculations (within 1% of provider bills)
- Customer adoption rate > 50% within 6 months
- Improved cost tracking granularity (token-level insights)
- Customer satisfaction score maintained > 4.5/5

### Quality Metrics

- Test coverage > 90% for new code
- Zero critical bugs in production
- Documentation completeness score > 95%
- API response accuracy > 99.9%

## Dependencies & Prerequisites

### Technical Dependencies

- Database migration framework (existing Drizzle setup)
- Updated TypeScript types and schemas
- UI component library (existing shadcn/ui)
- Testing framework (existing Jest/Vitest setup)
- Monitoring tools (existing observability stack)

### Business Dependencies

- Token pricing strategy definition and approval
- Customer communication plan for new features
- Legal review of billing changes
- Documentation updates for API changes
- Support team training on new features

### Infrastructure Dependencies

- Database capacity planning for new tables
- Monitoring setup for new metrics
- Backup strategy for additional data
- Performance testing environment

## Rollout Strategy

### Phase 1: Internal Testing (Week 11)

- Deploy to staging environment
- Internal testing with sample data
- Performance testing with simulated high-volume data
- Security review of new endpoints
- Documentation review

### Phase 2: Beta Release (Week 12)

- Select 5-10 beta customers for testing
- Gradual rollout to subset of customers
- Monitor performance and accuracy
- Collect feedback and iterate
- Support team training

### Phase 3: Full Production (Week 13-14)

- Full production deployment
- Customer communication and documentation
- Support team enablement
- Monitor adoption and usage patterns
- Collect customer feedback

### Rollback Plan

- Database migration rollback procedures
- API versioning to support rollback
- Feature flags for gradual rollout
- Monitoring alerts for issues
- Emergency response procedures

## Post-Implementation

### Monitoring & Maintenance

- Set up monitoring for new database tables
- Monitor API performance and error rates
- Track customer adoption of new features
- Regular review of cost calculation accuracy
- Monthly performance analysis

### Documentation

- API documentation updates
- Customer migration guides
- Internal development documentation
- Support team knowledge base
- FAQ and troubleshooting guides

### Future Enhancements

- Additional LLM providers (Cohere, Mistral, etc.)
- Advanced cost optimization features
- Machine learning for usage prediction
- Integration with customer billing systems
- Real-time cost monitoring and alerting

### Success Review

- 30-day post-launch review
- Customer feedback analysis
- Performance metrics analysis
- Lessons learned documentation
- Roadmap planning for future iterations

---

**Total Estimated Timeline: 14 weeks**
**Team Size: 2-3 developers + 1 PM + 1 QA**
**Risk Level: Medium (well-scoped with clear backward compatibility)**
**Budget Estimate: $150K - $200K (development costs)**

## Appendix

### A. File Structure

```
src/
├── lib/
│   ├── database/
│   │   ├── schema.ts (updated)
│   │   └── migrations/ (new migration files)
│   ├── llm/
│   │   ├── types.ts (new)
│   │   ├── cost-calculator.ts (new)
│   │   └── usage-tracker.ts (new)
│   └── analytics/
│       └── token-analytics.repo.ts (new)
├── routes/
│   ├── api/signals/
│   │   └── track.ts (updated)
│   └── agents/
│       └── signals/ (updated UI components)
```

### B. Configuration Examples

```typescript
// Example pricing configuration
const pricingConfig = {
  openai: {
    "gpt-4-turbo": {
      inputTokenPriceCents: 1.0, // $0.01 per 1K tokens
      outputTokenPriceCents: 3.0, // $0.03 per 1K tokens
      cachedTokenPriceCents: 0.5, // $0.005 per 1K tokens
    },
  },
  anthropic: {
    "claude-3-opus": {
      inputTokenPriceCents: 1.5, // $0.015 per 1K tokens
      outputTokenPriceCents: 7.5, // $0.075 per 1K tokens
    },
  },
};
```

### C. Migration Timeline

- Week 1: Database schema design and migration scripts
- Week 2: Core API implementation and testing
- Week 3: Cost calculation engine development
- Week 4: UI components and management interface
- Week 5: Analytics and reporting features
- Week 6: Integration testing and bug fixes
- Week 7: Performance optimization and monitoring
- Week 8: Documentation and training preparation
- Week 9: Beta testing preparation
- Week 10: Beta testing and feedback incorporation
- Week 11: Production deployment preparation
- Week 12: Staged production rollout
- Week 13: Full production deployment
- Week 14: Post-launch monitoring and support
