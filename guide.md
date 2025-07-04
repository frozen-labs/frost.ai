# Frost AI Guide

Frost AI is an open-source billing and analytics engine designed for AI companies to track costs, usage, and profitability per customer, agent, and AI model.

## Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Development](#development)
- [Production Deployment](#production-deployment)
- [Best Practices](#best-practices)

## Quick Start

Get Frost AI running in under 5 minutes:

```bash
# Clone the repository
git clone https://github.com/frozen-labs/frost.git
cd frost

# Copy environment configuration
cp .env.example .env

# Start the full stack (database + application)
make prod-up

# Access the application
open http://localhost:3000
```

The application will automatically:

- Start a PostgreSQL database
- Run database migrations
- Launch the web application on port 3000

## Installation

### Prerequisites

- Node.js 18+ and pnpm
- Docker and Docker Compose
- Git

### Development Setup

1. **Clone and Install Dependencies**

   ```bash
   git clone https://github.com/frozen-labs/frost.git
   cd frost
   pnpm install
   ```

2. **Configure Environment**

   ```bash
   cp .env.example .env
   ```

   Default configuration:

   ```env
   POSTGRES_USER=frostai
   POSTGRES_PASSWORD=frostai_dev
   POSTGRES_DB=frost_ai
   POSTGRES_PORT=5432
   FROSTAI_PORT=3000
   DATABASE_URL=postgresql://frostai:frostai_dev@localhost:5432/frost_ai
   ```

3. **Start Development Database**

   ```bash
   make dev-db
   pnpm db:push  # Push schema to database
   ```

4. **Start Development Server**
   ```bash
   pnpm dev
   ```

## Architecture

### Technology Stack

- **Frontend**: TanStack Start (React 19) with shadcn/ui
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS v4
- **Validation**: Zod schemas
- **Build**: Turborepo with pnpm workspaces

### Project Structure

```
frost/
├── apps/
│   └── fullstack/
│       ├── src/
│       │   ├── routes/      # Pages and API endpoints
│       │   ├── lib/         # Business logic
│       │   │   ├── database/   # Schema and repositories
│       │   │   └── services/   # Service layer
│       │   └── components/  # UI components
│       └── infrastructure/  # Docker configs
└── Makefile                # Development commands
```

### Database Schema

- **customers**: Customer records with unique slugs
- **agents**: AI agents/services per customer
- **validModels**: AI models with pricing (cents per 1M tokens)
- **tokenUsage**: Detailed usage tracking with auto-calculated costs
- **agentSignals**: Custom events with pricing
- **agentSignalLogs**: Signal occurrence tracking

## API Reference

### Base URL

```
http://localhost:3000/api
```

### Authentication

Currently no authentication required (add your own for production).

### Endpoints

#### Health Check

```http
GET /api/health
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Track Token Usage

```http
POST /api/metering/tokens
Content-Type: application/json

{
  "customerSlug": "acme-corp",
  "agentSlug": "chatbot-v1",
  "modelSlug": "gpt-4",
  "inputTokens": 1500,
  "outputTokens": 500
}
```

Response:

```json
{
  "id": "123",
  "cost": "0.0600",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Track Custom Signals

```http
POST /api/metering/signals
Content-Type: application/json

{
  "customerSlug": "acme-corp",
  "agentSlug": "chatbot-v1",
  "signalSlug": "document-processed",
  "metadata": {
    "pages": 10,
    "format": "pdf"
  }
}
```

#### Create Customer

```http
POST /api/customers
Content-Type: application/json

{
  "slug": "acme-corp",
  "name": "ACME Corporation",
  "metadata": {
    "tier": "enterprise",
    "contact": "john@acme.com"
  }
}
```

### Example: Python Client

```python
import requests

# Base configuration
BASE_URL = "http://localhost:3000/api"

# Track token usage
response = requests.post(
    f"{BASE_URL}/metering/tokens",
    json={
        "customerSlug": "acme-corp",
        "agentSlug": "chatbot-v1",
        "modelSlug": "gpt-4",
        "inputTokens": 1500,
        "outputTokens": 500
    }
)

# The cost is automatically calculated based on model pricing
print(f"Usage cost: ${response.json()['cost']}")
```

### Example: JavaScript/TypeScript Client

```typescript
// Track token usage after AI model call
async function trackUsage(usage: {
  inputTokens: number;
  outputTokens: number;
  model: string;
}) {
  const response = await fetch("http://localhost:3000/api/metering/tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerSlug: "acme-corp",
      agentSlug: "chatbot-v1",
      modelSlug: usage.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    }),
  });

  return response.json();
}
```

## Development

### Commands

```bash
# Database
make dev-db          # Start PostgreSQL container
make dev-db-down     # Stop database
make dev-db-clean    # Remove database and data
pnpm db:push         # Push schema changes
pnpm db:studio       # Open Drizzle Studio GUI

# Development
pnpm dev            # Start dev server (port 3000)
pnpm build          # Build for production
pnpm typecheck      # Run TypeScript checks
pnpm lint           # Run linting
```

### Adding New Features

1. **Database Changes**

   - Modify schema in `apps/fullstack/src/lib/database/schema.ts`
   - Run `pnpm db:push` to update database
   - Run `pnpm db:generate` to create migrations

2. **API Endpoints**

   - Add routes in `apps/fullstack/src/routes/api/`
   - Use Zod for input validation
   - Return proper HTTP status codes

3. **UI Components**
   - Add components in `apps/fullstack/src/components/`
   - Use shadcn/ui components when possible
   - Follow existing patterns

### Testing API Endpoints

```bash
# Health check
curl http://localhost:3000/api/health

# Track token usage
curl -X POST http://localhost:3000/api/metering/tokens \
  -H "Content-Type: application/json" \
  -d '{
    "customerSlug": "test-customer",
    "agentSlug": "test-agent",
    "modelSlug": "gpt-4",
    "inputTokens": 1000,
    "outputTokens": 500
  }'
```

## Production Deployment

### Using Docker Compose

```bash
# Start production stack
make prod-up

# Stop production stack
make prod-down
```

### Environment Variables

For production, update `.env` with:

- Strong database passwords
- Appropriate ports
- Production DATABASE_URL

### Database Migrations

Migrations run automatically on startup. To run manually:

```bash
pnpm db:migrate
```

### Monitoring

- Database: Access Drizzle Studio with `pnpm db:studio`
- Logs: Use `docker-compose logs -f` for container logs
- Health: Monitor `/api/health` endpoint

## Best Practices

### API Usage

1. **Consistent Slugs**: Use URL-safe, lowercase slugs for identifiers
2. **Batch Operations**: Group multiple tracking calls when possible
3. **Error Handling**: Implement retry logic for failed API calls
4. **Metadata**: Use metadata fields for additional context

### Cost Tracking

1. **Model Configuration**: Ensure all AI models have pricing configured
2. **Regular Monitoring**: Check usage patterns and costs regularly
3. **Alerts**: Set up alerts for unusual usage patterns
4. **Archival**: Consider archiving old data for performance

### Security

1. **Authentication**: Add authentication before production deployment
2. **Rate Limiting**: Implement rate limiting on API endpoints
3. **Input Validation**: All inputs are validated with Zod schemas
4. **Environment**: Never commit `.env` files to version control

### Performance

1. **Database Indexes**: Indexes are created on frequently queried fields
2. **Aggregation**: Analytics are aggregated in real-time
3. **Caching**: Consider adding Redis for frequently accessed data
4. **Connection Pooling**: Database connections are pooled automatically

## Troubleshooting

### Common Issues

**Database Connection Failed**

```bash
# Check if database is running
docker ps

# Restart database
make dev-db-down
make dev-db
```

**Port Already in Use**

```bash
# Change FROSTAI_PORT in .env
FROSTAI_PORT=3001
```

**Schema Out of Sync**

```bash
# Reset database and reapply schema
make dev-db-clean
make dev-db
pnpm db:push
```

## Support

- Issues: [GitHub Issues](https://github.com/frozen-labs/frost/issues)
- Documentation: This guide and CLAUDE.md
- Database GUI: Run `pnpm db:studio` to explore data

## License

MIT License - see LICENSE file for details.
