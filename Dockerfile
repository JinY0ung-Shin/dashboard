# PortKnox Dockerfile
# Multi-stage build for better-sqlite3 native module

# Build stage
FROM node:20-alpine AS builder

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
# Explicitly set NODE_ENV to ensure devDependencies are installed
ENV NODE_ENV=development
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Prune devDependencies
RUN npm prune --production

# Production stage
FROM node:20-alpine AS production

# Install runtime dependencies for better-sqlite3
RUN apk add --no-cache libstdc++

WORKDIR /app

# Copy built application
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Create data directory
RUN mkdir -p /app/data

# Set environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Expose port
EXPOSE 3000

# Run the application
CMD ["node", "build"]
