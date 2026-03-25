FROM node:22-slim

WORKDIR /app

# Install deps
COPY package.json package-lock.json* ./
RUN npm ci --production=false

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Remove devDeps
RUN npm prune --production

# Run worker
CMD ["node", "dist/index.js"]
