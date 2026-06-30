import { Injectable, MessageEvent, NotFoundException } from "@nestjs/common";
import { distinctUntilChanged, filter, from, map, merge, Observable, switchMap, takeWhile, timer } from "rxjs";
import { S3Service } from "../aws/s3.service";
import { RedisSubscriberService } from "../../db/redis.subscriber.service";
import { CompressorContract } from "./compressor.contract";
import { RequestCompressionDto } from "./dto/request-compression.dto";
import { isTerminal, toCompressionResponse } from "./compression.mapper";

// Safety poll: re-read the DB even when no Redis ping arrives, so a lost
// PUBLISH can't strand a stream on a stale state.
const POLL_MS = 20_000;

@Injectable()
export class CompressorService {
    constructor(
        private readonly s3: S3Service,
        private readonly repository: CompressorContract,
        private readonly events: RedisSubscriberService,
    ) { }

    async requestCompression(userId: string, dto: RequestCompressionDto) {
        const sourceKey = this.s3.generateSourceKey(userId, dto.filename)
        const compression = await this.repository.saveCompression(userId, sourceKey, dto)
        const uploadUrl = await this.s3.getUploadUrl({ key: sourceKey, contentType: dto.contentType })
        return {
            compressionId: compression.id,
            uploadUrl,
            sourceKey,
        }
    }

    async listCompressions(userId: string) {
        const rows = await this.repository.findManyByUser(userId)
        return rows.map(toCompressionResponse)
    }

    async streamCompression(userId: string, id: string): Promise<Observable<MessageEvent>> {
        // Ownership check up front, before the SSE headers are committed, so a
        // missing/foreign compression yields a clean 404 instead of an open stream.
        const initial = await this.repository.findOwnedById(userId, id)
        if (!initial) throw new NotFoundException()

        const read$ = () =>
            from(this.repository.findOwnedById(userId, id)).pipe(
                filter((row) => row !== null),
            )

        // Redis ping and safety poll both funnel through the same DB read — Redis
        return merge(
            this.events.channel(`compression:${id}`).pipe(switchMap(read$)),
            timer(0, POLL_MS).pipe(switchMap(read$)),
        ).pipe(
            distinctUntilChanged(
                (prev, current) => prev.status === current.status && prev.outputKey === current.outputKey && prev.error === current.error,
            ),
            takeWhile((row) => !isTerminal(row.status), true),
            map((row) => ({ data: toCompressionResponse(row) }) satisfies MessageEvent),
        )
    }
}
