import "dotenv/config";
import { defineConfig } from "prisma/config";
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Non-connecting commands (generate/format) work without a real URL — fall
    // back to a dummy so CI/Docker don't need to set DATABASE_URL just to run
    // `prisma generate`. Connecting commands (migrate/db push) still need a real one.
    url: process.env.DATABASE_URL ?? "postgresql://u:p@localhost:5432/db",
  },
});
