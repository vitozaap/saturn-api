import "dotenv/config"
import z from "zod"

const schema = z.object({
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
    SENTRY_DSN: z.url().optional(),
    REDIS_QUEUE_URL: z.url().nonempty(),
    // Presigned URL lifetimes (seconds). Kept short so a leaked URL is only
    // usable briefly. Download is single-shot, so it can be tighter than upload.
    PRESIGN_DOWNLOAD_TTL: z.coerce.number().int().positive().default(300),
    PRESIGN_UPLOAD_TTL: z.coerce.number().int().positive().default(900),
})

type Env = z.infer<typeof schema>
const env = schema.parse(process.env)

const validate = (config: Record<string, unknown>) => {
    return schema.parse(config);
}


export {
    env,
    type Env,
    validate,
}