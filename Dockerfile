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

# prisma.config.ts falls back to a dummy URL, so generate needs no DATABASE_URL.
RUN npx prisma generate
RUN npm run build
# Strip devDeps 
RUN npm prune --omit=dev

# Stage 3: Production runner
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copy pruned prod node_modules from builder
COPY --from=builder /build/node_modules ./node_modules

# Copy package.json for runtime resolution
COPY package.json ./

# Copy generated Prisma client from builder (app uses it at runtime via driver adapter)
COPY --from=builder /build/src/db/generated ./src/db/generated

# Copy compiled app
COPY --from=builder /build/dist ./dist

USER node
CMD ["node", "dist/main.js"]
