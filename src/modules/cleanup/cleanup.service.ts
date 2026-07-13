import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { CleanupContract } from "./cleanup.contract";
import { S3Service } from "../aws/s3.service";
import * as Sentry from "@sentry/nestjs"

@Injectable()
export class CleanupService {
    constructor(private readonly repository: CleanupContract, private readonly s3: S3Service) { }

    // Deletes every compression that is marked as FAILED or PENDING_UPLOAD for more than 5 minutes (every minute)
    @Cron(CronExpression.EVERY_MINUTE)
    async sweepUncompressed() {
        const cutoff = new Date(Date.now() - 5 * 60 * 1000)
        const stale = await this.repository.findExpirableBefore(cutoff, ["PENDING_UPLOAD", "FAILED"])
        if (stale) {
            Sentry.logger.info("Uncompressed rows older than 5 minutes deleted by cronjob", {
                affected: stale.length
            })
            await this.s3.DeleteMany(stale) 
            await this.repository.setExpiredRows(stale.map((row) => row.id))
        }
    }

    // Deletes every compression that is marked as COMPLETED for more than 1 day (every 00:00)
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async sweepCompleted() {
        const cutoff = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        const stale = await this.repository.findExpirableBefore(cutoff, ["COMPLETED"])
        if (stale) {
            Sentry.logger.info("Compressed rows older than 1 day deleted", {
                affected: stale.length
            })
            await this.s3.DeleteMany(stale)
            await this.repository.setExpiredRows(stale.map((row) => row.id))
        }
    }
}