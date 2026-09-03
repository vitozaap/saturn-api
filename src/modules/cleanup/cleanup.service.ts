import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { CleanupContract } from "./cleanup.contract";
import { S3Service } from "../cloud/s3.service";
import { SentryCron } from "@sentry/nestjs"

@Injectable()
export class CleanupService {
    constructor(private readonly repository: CleanupContract, private readonly s3: S3Service) { }

    // Deletes every compression that is marked as FAILED or PENDING_UPLOAD for more than 15 minutes (weekly)
    @Cron(CronExpression.EVERY_WEEK)
    @SentryCron('expire-uncompressed-rows', {
        schedule: {
            type: 'crontab',
            value: CronExpression.EVERY_WEEK
        },
        checkinMargin: 2,
        maxRuntime: 5
    })
    async sweepUncompressed() {
        const cutoff = new Date(Date.now() - 15 * 60 * 1000)
        const stale = await this.repository.findExpirableBefore(cutoff, ["PENDING_UPLOAD", "FAILED"], "createdAt")
        if (stale.length === 0) return
        // Only mark rows whose object was actually removed; if S3 throws, nothing is
        // marked and the same rows are retried on the next sweep.
        const deletedIds = await this.s3.deleteMany(stale)
        await this.repository.setExpiredRows(deletedIds)
    }

    // Deletes every compression that is marked as COMPLETED for more than 7 days (weekly)
    @Cron(CronExpression.EVERY_WEEK)
    @SentryCron('delete-completed-rows', {
        schedule: {
            type: 'crontab',
            value: CronExpression.EVERY_WEEK
        },
        checkinMargin: 5,
        maxRuntime: 10
    })
    async sweepCompleted() {
        const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        const stale = await this.repository.findExpirableBefore(cutoff, ["COMPLETED"], "completedAt")
        if (stale.length === 0) return
        const deletedIds = await this.s3.deleteMany(stale)
        await this.repository.setExpiredRows(deletedIds)
    }
}