FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
RUN npm install -g serve@14
COPY --from=builder /app/dist /app/dist
WORKDIR /app
CMD ["/bin/sh", "-c", "serve -s dist -l ${PORT:-3000}"]
