<p align="center">
  <h2 align="center">
    Frost AI
  </h2>
  <p align="center">
    The Open-Source Billing and Analytics Engine for AI
    <br />
    Stop losing money on AI costs.
    <br />
    <br />
<a href="https://x.com/florentmsl"><img src="https://img.shields.io/twitter/follow/florentmsl?label=Follow" alt="Follow on X"></a>
  </p>
</p>

<p align="center">
  <a href="https://github.com/frozen-labs/frost.ai/blob/main/LICENSE"><img src="https://img.shields.io/github/license/frozen-labs/frost.ai?style=for-the-badge&cache=none" alt="License"></a>
  <a href="https://github.com/frozen-labs/frost.ai/stargazers"><img src="https://img.shields.io/github/stars/frozen-labs/frost.ai?style=for-the-badge&logo=github&cache=none" alt="Stargazers"></a>
</p>

<p align="center">
  <a href="https://github.com/frozen-labs/frost.ai/issues">Report an Issue</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://github.com/frozen-labs/frost.ai/issues">Request a Feature</a>
</p>

---

<a href="https://github.com/frozen-labs/frost.ai/blob/main/assets/application-analytics-preview.png"><img src="https://github.com/frozen-labs/frost.ai/blob/main/assets/application-analytics-preview.png" alt="application-analytics-preview"></a>

## About the Project

**The Problem:** AI companies are burning through compute costs without visibility into profitability per customer, feature, or agent. Most developers discover they're losing money only after the damage is done.

**Our Solution:** Real-time cost tracking, margin analysis, and pricing optimization specifically designed for AI applications.

## Key Features

- **Customer & Agent Analytics**: Track costs, usage, and profitability per customer.
- **Real-time Metering**: Real-time cost tracking across OpenAI, Anthropic, Gemini, and more
- **Know Your Margins**: Margin analysis per customer, feature, and AI agent.
- **Scalable by Design**: Production-ready stack built for high-volume requests.
- **5-Minute Setup**: Launch instantly with Docker.
- **Self-Hosted & Secure**: Your data, your infrastructure. Total privacy.

## Getting Started in 5 Minutes

Deploy your own instance of Frost AI locally.

### Prerequisites

- **Docker** and **Docker Compose**: [Get Docker](https://www.docker.com/get-started)
- **Git**: [Install Git](https://git-scm.com/downloads)
- **pnpm**: `npm install -g pnpm`

### Getting Started

```sh
git clone https://github.com/frozen-labs/frost.ai.git
cd frost.ai
```

To start the application (includes the database), run:

```sh
cp /apps/fullstack/.env.example /apps/fullstack/.env
```

```sh
make prod-up
```

That's it\! Frost AI is now running at [**http://localhost:3000**](http://localhost:3000).
To stop the application, run:

```sh
make prod-down
```

## Usage: How to Track an AI Call

Just make an API call to track your costs.

### cURL

```sh
curl -X POST http://localhost:3000/api/signals/track \
-H "Content-Type: application/json" \
-d '{
  "customerId": "c2f4a5f0-1b3c-4d5e-6f7g-8h9i0j1k2l3m",
  "agentId": "customer-support-agent",
  "signalId": "email-processed",
  "metadata": {
    "used_tokens": 450,
    "model_used": "gpt-4-turbo",
    "prompt_id": "prompt_xyz789"
  }
}'
```

### Python (`requests`)

```python
import requests

payload = {
  "customerId": "c2f4a5f0-1b3c-4d5e-6f7g-8h9i0j1k2l3m",
  "agentId": "customer-support-agent",
  "signalId": "email-processed",
  "metadata": {
    "used_tokens": 450,
    "model_used": "gpt-4-turbo",
    "prompt_id": "prompt_xyz789"
  }
}

requests.post("http://localhost:3000/api/signals/track", json=payload)
```

### TypeScript/JS (`fetch`)

```javascript
const payload = {
  customerId: "c2f4a5f0-1b3c-4d5e-6f7g-8h9i0j1k2l3m",
  agentId: "customer-support-agent",
  signalId: "email-processed",
  metadata: {
    used_tokens: 450,
    model_used: "gpt-4-turbo",
    prompt_id: "prompt_xyz789",
  },
};

fetch("http://localhost:3000/api/signals/track", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
```

## Technology Stack

- **Framework**: [TanStack Start](https://tanstack.com/start/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) (Radix UI + Tailwind CSS)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Monorepo Tooling**: [Turborepo](https://turbo.build/) & [pnpm](https://pnpm.io/)
- **Containerization**: [Docker](https://www.docker.com/)

## Roadmap

Our vision is to build it into a complete, end-to-end billing solution for AI companies.

- [ ] **Subscription & Hybrid Pricing Models**: Move beyond simple per-action pricing to support monthly/yearly subscriptions, tiered pricing, and complex hybrid models (e.g., a base fee + overages).
- [ ] **True Billing & Invoicing**: The highest priority is to build the billing engine. This will include generating invoices from the tracked usage data and integrating with payment gateways like Stripe.
- [ ] **Advanced Analytics & Alerting**: Deeper insights, customizable reports, and automated alerts to notify you of cost spikes or low margins.
- [ ] **Client-side SDKs**: Official libraries for Python and JS/TS to make integration trivial.

Have an idea for our roadmap? [**Suggest a feature\!**](https://github.com/frozen-labs/frost.ai/issues)

## Shape the Future of Frost AI

Frost AI is a free and open-source project. We welcome contributions of all kinds\! Whether you're a developer, a designer, or just an enthusiast, you can help make this project better.

- **[Submit an Issue or Feature Request](https://github.com/frozen-labs/frost.ai/issues)**
- **Star our repo ⭐**

<p align="center">
  <sub>Thanks to our friends: Drizzle, TanStack, shadcn/ui, Turborepo, and the countless other open-source projects that make Frost AI possible.</sub>
</p>
