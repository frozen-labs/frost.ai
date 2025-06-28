# Frost AI - Developer's Guide

---

### Quick Start

**Install dependencies:**

```sh
pnpm install
```

**Set up your environment:**

```sh
cp .env.example .env
```

**Start the development database:**

```sh
make dev-db
```

**Run the development server:**

```sh
pnpm dev
```

The application will be available at `http://localhost:3000`.

---

### Commands

- `pnpm dev`: Starts the development server for the `fullstack` app with hot-reloading.
- `pnpm build`: Builds all applications in the monorepo for production.
- `pnpm test`: Runs tests across the repository.
- `pnpm lint`: Lints the codebase.
- `pnpm typecheck`: Runs TypeScript to check for type errors.

### Database (`drizzle-kit`)

These commands are typically run inside the `apps/fullstack` directory or using the `pnpm --filter` command.

- `pnpm db:push`: Pushes the current schema directly to the database, bypassing the migration system.
- `pnpm db:studio`: Opens Drizzle Studio, a local GUI for browsing your database.

### Docker (`Makefile`)

The `Makefile` at the root of the project provides convenient shortcuts for managing the Docker environment.

- `make dev-db`: Starts the PostgreSQL database container for the development environment.
- `make dev-db-down`: Stops the development database container.
- `make dev-db-clean`: **(Destructive)** Stops and removes the development database container and its associated data volume. Use this if you need to reset your database.
- `make prod-up`: Builds and starts the production-ready application.
- `make prod-down`: Stops all production containers.

---
