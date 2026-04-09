# ── Stage 1: Builder ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace manifests needed to resolve the internal packages
COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./
COPY packages/config/package.json   ./packages/config/
COPY packages/types/package.json    ./packages/types/
COPY packages/validators/package.json ./packages/validators/

# Copy the service's own manifest
COPY services/api-gateway/package.json ./services/api-gateway/

# Install only the api-gateway subtree (frozen lockfile for reproducibility)
RUN pnpm install --frozen-lockfile --filter @ai-startup-builder/api-gateway...

# Copy source files (workspace packages first, then the service)
COPY packages/config     ./packages/config
COPY packages/types/src  ./packages/types/src
COPY packages/validators/src ./packages/validators/src
COPY services/api-gateway/src ./services/api-gateway/src
COPY services/api-gateway/tsconfig.json ./services/api-gateway/

# Compile TypeScript
WORKDIR /app/services/api-gateway
RUN pnpm run build

# ── Stage 2: Runner ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy only the compiled artifacts and manifests needed for production deps
COPY --from=builder /app/services/api-gateway/dist ./dist
COPY --from=builder /app/services/api-gateway/package.json ./

# Install production-only dependencies
RUN pnpm install --prod --ignore-scripts

# Non-root user for security
USER 1001

EXPOSE 4000

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
