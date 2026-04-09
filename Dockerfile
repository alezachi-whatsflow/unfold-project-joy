FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Cache buster: 2026-04-09-v2
# Force correct Supabase self-hosted URL at build time
ENV VITE_SUPABASE_URL="https://supabase.whatsflow.com.br"
ENV VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc0MDI5ODAwLCJleHAiOjE5MzE3MDk4MDB9.nGuFy4XjBPEkzvfxaM9P_NH5zj9Fq2VSMQMIaDOGhoc"
RUN npm run build

FROM node:20-alpine
RUN npm install -g serve@14
COPY --from=builder /app/dist /app/dist
WORKDIR /app
CMD ["/bin/sh", "-c", "serve -s dist -l ${PORT:-3000}"]
