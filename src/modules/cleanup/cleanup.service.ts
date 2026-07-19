import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { CleanupContract } from "./cleanup.contract";
import { S3Service } from "../aws/s3.service";
import { SentryCron } from "@sentry/nestjs"

@Injectable()
export class CleanupService {
    constructor(private readonly repository: CleanupContract, private readonly s3: S3Service) { }

    // Deletes every compression that is marked as FAILED or PENDING_UPLOAD for more than 5 minutes (every minute)
    @Cron(CronExpression.EVERY_MINUTE)
    @SentryCron('expire-uncompressed-rows', {
        schedule: {
            type: 'crontab',
            value: CronExpression.EVERY_MINUTE
        },
        checkinMargin: 2,
        maxRuntime: 5
    })
    async sweepUncompressed() {
        const cutoff = new Date(Date.now() - 5 * 60 * 1000)
        const stale = await this.repository.findExpirableBefore(cutoff, ["PENDING_UPLOAD", "FAILED"], "createdAt")
        if (stale.length === 0) return
        // Only mark rows whose object was actually removed; if S3 throws, nothing is
        // marked and the same rows are retried on the next sweep.
        const deletedIds = await this.s3.DeleteMany(stale)
        await this.repository.setExpiredRows(deletedIds)
    }

    // Deletes every compression that is marked as COMPLETED for more than 1 day (every 00:00)
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    @SentryCron('delete-completed-rows', {
        schedule: {
            type: 'crontab',
            value: CronExpression.EVERY_DAY_AT_MIDNIGHT
        },
        checkinMargin: 5,
        maxRuntime: 10
    })
    async sweepCompleted() {
        const cutoff = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        const stale = await this.repository.findExpirableBefore(cutoff, ["COMPLETED"], "completedAt")
        if (stale.length === 0) return
        const deletedIds = await this.s3.DeleteMany(stale)
        await this.repository.setExpiredRows(deletedIds)
    }
}