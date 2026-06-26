# CLAUDE.md

Guidance for working in this repository (the **API** of the Video Compressor project).

## What this is

A cloud-scale video compression service running on AWS. Users upload videos via S3 presigned URLs; a pool of Fargate workers consumes a queue and compresses the files with **ffmpeg**, writing the result back to S3.

This package (`api/`) is the **NestJS control-plane API**: it authenticates users, issues presigned upload URLs, and tracks the lifecycle/status of each compression in Postgres. The ffmpeg work itself runs in separate Fargate workers that consume SQS.

## Tech stack

- **Runtime/framework:** Node.js + NestJS 11
- **Database:** PostgreSQL via Prisma 7 (generated client in `src/db/generated/prisma`)
- **Auth:** better-auth (`@thallesp/nestjs-better-auth`, Prisma adapter)
- **AWS:** SDK v3 — S3 + presigned URLs (`@aws-sdk/s3-request-presigner`), region `sa-east-1`
- **Validation:** zod, class-validator
- **API docs:** Swagger + Scalar reference

## Application flow

1. **Request compression** — authenticated user calls the API. The API creates a `Compression` row with status `PENDING_UPLOAD` (id generated first via `uuidv7()`), then returns a **presigned S3 upload URL** pointing at `uploads/{userId}/{compressionId}/{filename}`.
2. **Upload** — the user PUTs the video directly to S3 using that URL.
3. **Enqueue** — the S3 `ObjectCreated` event publishes a message to **SQS**. The object key carries `userId` + `compressionId`, so the row is resolved deterministically (or by `sourceKey`, which is unique).
4. **Compress** — Fargate workers poll SQS, transition the row `QUEUED → PROCESSING` (guarded `updateMany` for SQS at-least-once idempotency), and run ffmpeg.
5. **Deliver** — the compressed file is written to `compressed/{userId}/{compressionId}`; the row is updated to `COMPLETED` with `outputKey`/`outputSize`, or `FAILED` with an `error` message.

### Status lifecycle

`PENDING_UPLOAD → QUEUED → PROCESSING → COMPLETED` (or `FAILED` from `PROCESSING`).

## Data model

A single `Compression` model owns the full lifecycle (source → job → output) — there are intentionally **no separate `Video`/`Compressed` tables** (1 upload = 1 job, single output). See `prisma/schema.prisma`. Key conventions:

- `id` is a `uuidv7()` UUID, generated before the presigned URL so it can be embedded in the S3 key.
- File sizes are `BigInt` (videos exceed `Int` / ~2GB).
- Compression ratio is **derived** (`outputSize / sourceSize`), never stored.

## Project structure

- `src/modules/compressor/` — compression endpoints, service, contract
- `src/modules/aws/s3.service.ts` — S3 client + presigned URL generation
- `src/config/` — env (`env.ts`) and auth configuration
- `src/db/` — Prisma service and generated client
- `prisma/schema.prisma` — database schema

## Common commands

```bash
npm run start:dev     # run API in watch mode
npm run build         # nest build
npm run db:generate   # prisma generate
npm run db:migrate    # prisma migrate dev
npm run db:push       # prisma db push (dev only)
npm run db:seed       # seed database
```

## GitHub

- Issues and pull requests are managed on GitHub via the `gh` CLI.
- Open a PR against `develop`; PRs are reviewed before merge.
- PR titles/descriptions follow Conventional Commits (see below).

## Git workflow

- Development branches (feature, fix, refactor, chore, etc.) always branch off `develop` — never off `main`.
- Branch names, commit messages, and PR titles/descriptions are written in English, following [Conventional Commits](https://www.conventionalcommits.org/) (e.g. `feat:`, `fix:`, `refactor:`, `chore:`).
