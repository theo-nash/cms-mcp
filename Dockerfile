# Base stage for both development and production
FROM node:23.3.0-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install -g typescript ts-node

# Development stage
FROM base AS builder
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM base AS production
RUN npm install --production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Health check for both stages
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api-docs || exit 1

EXPOSE 3000
CMD ["node", "dist/index.js"] 