# ── Stage 1: Builder ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./
COPY packages/config/package.json ./packages/config/
COPY services/billing-service/package.json ./services/billing-service/

RUN pnpm install --frozen-lockfile --filter @ai-startup-builder/billing-service...

COPY packages/config ./packages/config
COPY services/billing-service/src ./services/billing-service/src
COPY services/billing-service/tsconfig.json ./services/billing-service/

WORKDIR /app/services/billing-service
RUN pnpm run build

# ── Stage 2: Runner ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=builder /app/services/billing-service/dist ./dist
COPY --from=builder /app/services/billing-service/package.json ./

RUN pnpm install --prod --ignore-scripts

USER 1001

EXPOSE 4006

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
