# Base stage for both development and production
FROM node:23.3.0-slim AS base
WORKDIR /app
COPY package*.json ./
# Install build dependencies needed for WebRTC
RUN apt-get update && \
    apt-get install -y python3 make g++ build-essential wget && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    npm install -g typescript ts-node

# Development stage
FROM base AS builder
RUN npm install
# Install WebRTC binary directly
RUN npm install @roamhq/wrtc-linux-x64
COPY . .
RUN npm run build

# Production stage
FROM base AS production
RUN npm install --production
# Install WebRTC binary directly in production too
RUN npm install @roamhq/wrtc-linux-x64
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Copy environment files
COPY .env* ./

# Health check for both stages
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api-docs || exit 1

EXPOSE 3000
CMD ["node", "dist/index.js"]