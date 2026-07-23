import "dotenv/config"
import z from "zod"
import { schema } from "./env.schema"

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