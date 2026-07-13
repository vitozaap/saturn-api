import { InjectQueue } from "@nestjs/bullmq"
import { Injectable } from "@nestjs/common"
import { COMPRESS_JOB, COMPRESSIONS_QUEUE } from "./compressor.queue"
import { Queue } from "bullmq"

@Injectable()
export class CompressionProducer {
    constructor(@InjectQueue(COMPRESSIONS_QUEUE) private readonly queue: Queue) {}

    async enqueue(compressionId: string) {
        await this.queue.add(
            COMPRESS_JOB,
            { compressionId },
            {
                jobId: compressionId,
                attempts: 3,
                backoff: { type: "exponential", delay: 5000 },
                removeOnComplete: true,
                removeOnFail: 1000,
            },
        )
    }
}
