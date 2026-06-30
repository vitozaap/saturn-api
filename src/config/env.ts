import "dotenv/config"
import z from "zod"

const schema = z.object({
    DATABASE_URL: z.url().nonempty(),
    BETTER_AUTH_SECRET: z.string().nonempty(),
    BETTER_AUTH_URL: z.url().nonempty(),
    WEB_URL: z.url().nonempty(),
    BUCKET: z.string().nonempty(),
    UPLOADS_PATH: z.string().nonempty(),
    NODE_ENV: z.string().nonempty()
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