FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy application source
COPY . .

# Build the application
RUN npm run build

# Generate Prisma client
RUN npx prisma generate

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/generated ./generated

# Expose the API port
EXPOSE 3000

# Wait for PostgreSQL to be ready, run migrations, then start the application
CMD ["/bin/sh", "-c", "npx prisma migrate deploy && npm run start:prod"]
