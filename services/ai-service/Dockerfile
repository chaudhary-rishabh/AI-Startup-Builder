# ── Stage 1: Builder ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY pnpm-workspace.yaml ./
COPY package.json pnpm-lock.yaml ./
COPY packages/config/package.json   ./packages/config/
COPY packages/types/package.json    ./packages/types/
COPY packages/validators/package.json ./packages/validators/
COPY packages/db/package.json       ./packages/db/
COPY services/ai-service/package.json ./services/ai-service/

RUN pnpm install --frozen-lockfile --filter @ai-startup-builder/ai-service...

COPY packages/config     ./packages/config
COPY packages/types/src  ./packages/types/src
COPY packages/validators/src ./packages/validators/src
COPY packages/db/src     ./packages/db/src
COPY services/ai-service/src ./services/ai-service/src
COPY services/ai-service/tsconfig.json ./services/ai-service/

WORKDIR /app/services/ai-service
RUN pnpm run build

# ── Stage 2: Runner ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=builder /app/services/ai-service/dist ./dist
COPY --from=builder /app/services/ai-service/package.json ./

RUN pnpm install --prod --ignore-scripts

USER 1001

EXPOSE 4004

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
