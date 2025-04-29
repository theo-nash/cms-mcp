FROM node:23.3.0-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install -g typescript ts-node
RUN npm install

COPY . .
RUN npm run build

# Copy environment files
COPY .env* ./

# The crucial part - command to start only the MCP server
CMD ["node", "dist/mcp/index.js"]