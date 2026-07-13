import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";


@Injectable()
export class CleanupService {
    @Cron(CronExpression.EVERY_MINUTE)
    async sweepUncompressed() {
        // TODO
    }
}