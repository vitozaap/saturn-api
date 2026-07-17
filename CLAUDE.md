# CLAUDE.md

Guidance for working in this repository (the **API** of the Squish video compressor — repo name keeps the legacy `saturn` prefix).

## What this is

The **NestJS control-plane API** of Squish: authenticates users, issues presigned upload/download URLs, tracks the lifecycle of each compression in Postgres, enqueues jobs to BullMQ, and streams status over SSE.

Everything runs on a single ARM VPS (Oracle Cloud) via Docker Compose: this API, MinIO (object storage), the queue Redis, and the worker. The ffmpeg work runs in a **separate repo** ([`saturn-compression-worker`](https://github.com/vitozaap/saturn-compression-worker)); the two communicate only through shared contracts (queue, database, pub/sub) — never by importing each other's code.

## Tech stack

- **Runtime/framework:** Node.js + NestJS 11, TypeScript strict
- **Database:** PostgreSQL (Neon) via Prisma 7 (generated client in `src/db/generated/prisma`)
- **Auth:** better-auth (`@thallesp/nestjs-better-auth`, Prisma adapter, anonymous sessions)
- **Object storage:** MinIO (S3-compatible, self-hosted) — AWS SDK v3 + presigned URLs
- **Queue:** BullMQ producer (`@nestjs/bullmq`) on the VPS Redis
- **Realtime:** SSE (RxJS `Observable`) fed by Redis pub/sub (Upstash)
- **Scheduling:** `@nestjs/schedule` crons (cleanup)
- **Validation:** zod (env), class-validator (DTOs)
- **Observability:** Sentry. **Docs:** Swagger + Scalar at `/reference`. **Tests:** Vitest.

## Two Redis instances

- **`REDIS_QUEUE_URL`** — self-hosted Redis on the VPS (`compose.queue.yml`), for BullMQ. Chatty, so it must be free/local. The worker repo calls this same instance `WORKER_QUEUE_URL` — align names when touching env.
- **`REDIS_URL`** — Upstash, pub/sub only. The worker publishes to `compression:{id}`; `redis.subscriber.service.ts` subscribes and wakes the SSE stream. The payload is ignored — every wake re-reads the row from Postgres.

## Application flow

1. **Request compression** — `POST /compressor`: generates `sourceKey` (`uploads/{userId}/{randomUUID}/{filename}` — UUID independent of the compression id), creates a `Compression` row as `PENDING_UPLOAD`, returns a presigned MinIO upload URL.
2. **Upload** — the user PUTs the video directly to MinIO (never through the API).
3. **Confirm** — `POST /compressor/confirm-upload`: the API HEADs the object to validate the upload, sets `QUEUED`, and enqueues `{ compressionId }` to BullMQ (`compression.producer.ts`: `jobId = compressionId` for dedup, 3 attempts, exponential backoff).
4. **Compress** — the worker claims the row with a guarded `UPDATE ... WHERE status IN ('QUEUED','PROCESSING')` (at-least-once idempotency) and runs ffmpeg.
5. **Deliver** — output goes to `compressed/{userId}/{compressionId}`; the row becomes `COMPLETED` (`outputKey`/`outputSize`) or `FAILED` (`error`). Each transition publishes to `compression:{id}`, which the SSE stream (`GET /compressor/:id/stream`) relays; the stream closes on `COMPLETED`/`FAILED`.

### Status lifecycle

`PENDING_UPLOAD → QUEUED → PROCESSING → COMPLETED | FAILED`, plus **`EXPIRED`** set by the cleanup crons (`src/modules/cleanup/`):

- every minute: `PENDING_UPLOAD`/`FAILED` older than 5 min → delete object, mark `EXPIRED`
- daily at midnight: `COMPLETED` older than 1 day → delete output, mark `EXPIRED`

Rows are only marked after the S3 delete succeeds, so failed sweeps retry naturally. MinIO also has a lifecycle rule expiring raw uploads after 1 day.

## Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/compressor` | Create compression, return presigned upload URL |
| `POST` | `/compressor/confirm-upload` | Validate upload (HEAD), enqueue job |
| `POST` | `/compressor/download` | Presigned download URL for the output |
| `GET` | `/compressor` | List the authenticated user's compressions |
| `GET` | `/compressor/:id/stream` | SSE status stream |
| `*` | `/api/auth/*` | better-auth routes |

## Data model

A single `Compression` model owns the full lifecycle (source → job → output) — intentionally no separate `Video`/`Compressed` tables. See `prisma/schema.prisma`. Conventions:

- `id` is `uuidv7()`. It is **not** embedded in the S3 key; `sourceKey` (unique) is the object↔row link.
- File sizes are `BigInt` (videos exceed `Int` / ~2GB).
- Compression ratio is **derived** (`outputSize / sourceSize`), never stored.
- `preset` (`HIGH | MID | LOW`) is chosen at request time and executed by the worker. The API owns the schema and migrations; the worker only reads/updates rows.

## Project structure

- `src/modules/compressor/` — controller, service, repository, DTOs, BullMQ producer (`compression.producer.ts`, `compressor.queue.ts`)
- `src/modules/cleanup/` — cron sweeps (expired uploads/outputs)
- `src/modules/aws/s3.service.ts` — S3 client + presigned URLs (MinIO endpoint)
- `src/db/` — Prisma service, Redis subscriber (SSE wake), generated client
- `src/config/` — zod env (`env.ts`), better-auth config
- `compose.dev.yml` / `compose.prod.yml` / `compose.queue.yml` — local infra / prod API+MinIO / queue Redis. Prod composes join the external Docker network `saturn-net`, shared with the worker.

## Common commands

```bash
npm run start:dev     # run API in watch mode
npm run build         # nest build
npm run test          # vitest run
npm run db:generate   # prisma generate
npm run db:migrate    # prisma migrate dev
npm run db:push       # prisma db push (dev only)
```

## Deploy

Push to `main` triggers `.github/workflows/deploy.yml`: multi-stage ARM64 image → ghcr.io → SSH into the VPS → `docker compose pull && up`. Prisma migrations run only when `prisma/migrations/**` changes.

## GitHub / Git workflow

- Issues and PRs managed on GitHub via the `gh` CLI. PRs open against `develop`; reviewed before merge.
- Development branches always branch off `develop` — never off `main`.
- Branch names, commits, and PR titles/descriptions in English, following [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `refactor:`, `chore:`).
