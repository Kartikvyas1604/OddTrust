FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY pnpm-lock.yaml package.json ./
RUN pnpm fetch --frozen-lockfile

COPY . .

RUN pnpm install --frozen-lockfile --offline

FROM node:22-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 oddtrust && \
    adduser --system --uid 1001 oddtrust

COPY --from=builder /app/apps/web/ws-server.ts ./ws-server.ts
COPY --from=builder /app/apps/web/lib ./lib
COPY --from=builder /app/apps/web/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

USER oddtrust

ENV NODE_ENV=production
ENV LOG_PRETTY=false

EXPOSE 3002

CMD ["node", "--import", "tsx", "ws-server.ts"]
