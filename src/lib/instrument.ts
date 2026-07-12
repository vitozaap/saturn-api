import * as Sentry from "@sentry/nestjs"
import { env } from "../config/env"
import { BadRequestException } from "@nestjs/common"

Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    enableLogs: true,
    ignoreErrors: ["NotFoundException"],
    beforeSend(event, hint) {
        const err = hint.originalException
        if (err instanceof BadRequestException && err.getStatus() < 500) return null
        return event
    },
})
