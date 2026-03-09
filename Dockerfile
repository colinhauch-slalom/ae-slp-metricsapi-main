# Multi-stage Dockerfile for MetricsAPI

# ---- Build Stage ----
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and compile
COPY tsconfig.json ./
COPY src/ ./src/

RUN npx tsc

# ---- Runtime Stage ----
FROM node:20-slim

WORKDIR /app

# Copy package files and install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Copy migrations for database setup
COPY migrations/ ./migrations/

EXPOSE 3000

CMD ["node", "dist/index.js"]
