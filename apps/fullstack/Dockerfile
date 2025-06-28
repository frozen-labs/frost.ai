FROM node:22-alpine AS base

RUN npm install -g pnpm@10.12.3
WORKDIR /app

# Copy root workspace files (build context is from repo root)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Copy only the specific app we're building
COPY apps/fullstack ./apps/fullstack/

# Install dependencies for this app only
RUN pnpm install --frozen-lockfile --filter @frostai/fullstack

# Build the specific app
RUN pnpm --filter @frostai/fullstack build


FROM node:22-alpine AS production

RUN npm install -g pnpm@10.12.3
WORKDIR /app

# Copy root workspace files for production
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/fullstack/package.json ./apps/fullstack/package.json

# Install only production dependencies for this app
RUN pnpm install --frozen-lockfile --prod --filter @frostai/fullstack

# Copy built application from base stage
COPY --from=base /app/apps/fullstack/.output ./.output

# Copy drizzle config and schema for migrations
COPY apps/fullstack/drizzle.config.ts ./apps/fullstack/
COPY apps/fullstack/src/lib/database/schema.ts ./apps/fullstack/src/lib/database/

# Create non-root user for security
RUN addgroup -g 1001 -S frostai
RUN adduser -S frostai-user -u 1001

# Change ownership of the app directory to the frostai user
RUN chown -R frostai-user:frostai /app
USER frostai-user

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]