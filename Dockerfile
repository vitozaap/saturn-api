# Stage 1: Single install (full: prod + dev) — single source of node_modules
FROM node:24-alpine AS deps
WORKDIR /deps
COPY package*.json ./
RUN npm ci

# Stage 2: Build (reuses node_modules from deps — no reinstall)
FROM node:24-alpine AS builder
WORKDIR /build
COPY --from=deps /deps/node_modules ./node_modules
COPY . .

# Dummy DATABASE_URL satisfies prisma.config.ts env() at load time; generate does not connect.
RUN DATABASE_URL="postgresql://u:p@localhost:5432/db" npx prisma generate
RUN npm run build
# Strip devDeps 
RUN npm prune --omit=dev

# Stage 3: Production runner
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy pruned prod node_modules from builder
COPY --from=builder /build/node_modules ./node_modules

# Copy package.json for runtime resolution
COPY package.json ./

# Copy generated Prisma client from builder (app uses it at runtime via driver adapter)
COPY --from=builder /build/src/db/generated ./src/db/generated

# Copy compiled app
COPY --from=builder /build/dist ./dist

# Amazon RDS CA bundle so the Postgres driver can verify TLS to RDS (rds.force_ssl=1)
RUN mkdir -p /app/certs \
  && wget -qO /app/certs/global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem

USER node
CMD ["node", "dist/main.js"]
