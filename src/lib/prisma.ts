import "dotenv/config";

import { readFileSync } from "node:fs";
import { PrismaClient } from "../db/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../config/env";

const rawDatabaseUrl = env.DATABASE_URL;
const databaseUrl = (rawDatabaseUrl ?? "").trim();
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

// RDS enforces TLS (rds.force_ssl=1). In production we verify the server
// certificate against the Amazon RDS CA bundle shipped in the image.
// Local dev (local Postgres) connects without TLS.
const ssl =
  env.NODE_ENV === "production"
    ? {
        ca: readFileSync("/app/certs/global-bundle.pem", "utf-8"),
        rejectUnauthorized: true,
      }
    : undefined;

const adapter = new PrismaPg({
  connectionString: databaseUrl,
  ssl,
});

export const prismaClientOptions = { adapter };

export function createPrismaClient() {
  return new PrismaClient(prismaClientOptions);
}
