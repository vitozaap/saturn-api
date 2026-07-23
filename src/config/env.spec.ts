import { describe, expect, it } from "vitest";
import { schema } from "./env.schema";
import * as Sentry from "@sentry/node"
import z from "zod";

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    enableLogs: true,
})
describe("Production environment secrets validation", () => {
    it("Should successfully parse actual runtime environment secrets", async () => {
        const parse = schema.safeParse(process.env)
        if (!parse.success) {
            Sentry.captureException(parse.error, {
                extra: {
                    zodIssues: parse.error.issues,
                },
                tags: {
                    context: "env_validation"
                }
            })
            // Sentry sends async; flush before the process exits or the event is lost.
            await Sentry.flush(2000)

            // will show a pretty error message telling which env variable failed
            expect.fail(z.prettifyError(parse.error))
        }
        expect(parse.success).toBeTruthy()
    })
})