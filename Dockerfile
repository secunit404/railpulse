# =============================================================================
# Multi-stage Dockerfile for RailPulse
# Builds both frontend and backend, serving frontend as static files from backend
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build Frontend (Vue 3 + Vite)
# -----------------------------------------------------------------------------
FROM node:20-slim AS frontend-build

WORKDIR /frontend

# Install frontend dependencies
COPY frontend/package*.json ./
RUN npm ci

# Copy source files and shared types
COPY frontend .
COPY shared /shared

# Build production frontend
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Build Backend (Node.js + Express + Prisma)
# -----------------------------------------------------------------------------
FROM node:20-slim AS backend-build

WORKDIR /app

# Install system dependencies required by Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install backend dependencies (better layer caching)
COPY backend/package*.json ./
RUN npm ci

# Copy backend source files
COPY backend/tsconfig.json ./tsconfig.json
COPY backend/src ./src
COPY backend/prisma ./prisma
COPY shared /shared

# Generate Prisma client and build TypeScript
ENV DATABASE_URL="file:./data/dev.db"
RUN mkdir -p data && npx prisma generate
RUN npm run build

# Remove dev dependencies for smaller image
RUN npm prune --omit=dev

# -----------------------------------------------------------------------------
# Stage 3: Production Runtime
# -----------------------------------------------------------------------------
FROM node:20-slim

WORKDIR /app

# Install OpenSSL (required by Prisma at runtime)
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY backend/package*.json ./

# Copy production dependencies and built artifacts
COPY --from=backend-build /app/node_modules ./node_modules
COPY --from=backend-build /app/dist ./dist
COPY backend/prisma ./prisma

# Copy frontend static files (served by backend)
COPY --from=frontend-build /frontend/dist ./public

# Copy shared types and entrypoint
COPY shared /shared
COPY backend/entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Create data directory
RUN mkdir -p /app/data/logs

# Set production mode
ENV NODE_ENV=production

EXPOSE 9876

ENTRYPOINT ["./entrypoint.sh"]
