import z from "zod";

export const schema = z.object({
    DATABASE_URL: z.url().nonempty(),
    BETTER_AUTH_SECRET: z.string().nonempty(),
    BETTER_AUTH_URL: z.url().nonempty(),
    WEB_URL: z.url().nonempty(),
    BUCKET: z.string().nonempty(),
    UPLOADS_PATH: z.string().nonempty(),
    NODE_ENV: z.string().nonempty(),
    REDIS_URL: z.url().nonempty(),
    MINIO_USER: z.string().nonempty(),
    MINIO_PASSWORD: z.string().nonempty(),
    S3_ENDPOINT: z.url().nonempty(),
    S3_PUBLIC_ENDPOINT: z.url().nonempty().optional(),
    SENTRY_DSN: z.url().nonempty(),
    REDIS_QUEUE_URL: z.url().nonempty(),
    PRESIGN_DOWNLOAD_TTL: z.coerce.number().int().positive().default(300),
    PRESIGN_UPLOAD_TTL: z.coerce.number().int().positive().default(900),
})