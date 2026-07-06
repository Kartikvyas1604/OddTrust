FROM node:22-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && pnpm install --frozen-lockfile --prod

COPY tsconfig.json ./
COPY src/ ./src/
RUN corepack enable && pnpm build

FROM node:22-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 oddtrust && \
    adduser --system --uid 1001 oddtrust

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY migrations/ ./migrations/
COPY package.json ./

USER oddtrust

ENV NODE_ENV=production
ENV LOG_PRETTY=false

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "dist/main.js"]
