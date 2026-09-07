# syntax=docker/dockerfile:1
# Build context is the repo root: docker build -f apps/api/Dockerfile .

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /repo

# ---- Dependencies --------------------------------------------------------
# Only the manifests are copied first so this layer caches until they change.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY packages/env/package.json packages/env/
COPY packages/shared/package.json packages/shared/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter "@cigbuddy/api..."

# ---- Build ---------------------------------------------------------------
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/ packages/
COPY apps/api/ apps/api/
RUN pnpm --filter @cigbuddy/api build
# `deploy` prunes to production dependencies and hard-copies the workspace
# packages, so the result needs nothing from outside its own directory.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --filter @cigbuddy/api deploy --prod --legacy /prod/api \
    && cp -r packages/db/src/migrations /prod/api/dist/migrations

# ---- Runtime -------------------------------------------------------------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    API_PORT=3000 \
    API_HOST=0.0.0.0
WORKDIR /app
COPY --from=build /prod/api/package.json ./
COPY --from=build /prod/api/node_modules ./node_modules
COPY --from=build /prod/api/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/api/health/ready > /dev/null || exit 1
CMD ["node", "dist/index.js"]
