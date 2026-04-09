# ── Build Stage ──
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

# ── Production Stage ──
FROM node:20-alpine
RUN apk add --no-cache tini
WORKDIR /app

COPY package*.json ./
RUN npm ci --production && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3100

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]
