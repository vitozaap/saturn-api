import "dotenv/config"

import { PrismaClient } from "../db/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { env } from "../config/env"

const rawDatabaseUrl = env.DATABASE_URL
const databaseUrl = (rawDatabaseUrl ?? "").trim()
if (!databaseUrl) {
    throw new Error("DATABASE_URL is required")
}

const ssl = env.NODE_ENV == "production" ? { rejectUnauthorized: true } : undefined;
const adapter = new PrismaPg({
    connectionString: databaseUrl,
    ssl
})

export const prismaClientOptions = { adapter }

export function createPrismaClient() {
    return new PrismaClient(prismaClientOptions)
}
