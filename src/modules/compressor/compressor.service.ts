import { Injectable, MessageEvent, NotFoundException } from "@nestjs/common"
import { distinctUntilChanged, filter, from, map, merge, Observable, switchMap, takeWhile, timer } from "rxjs"
import { S3Service } from "../aws/s3.service"
import { RedisSubscriberService } from "../../db/redis.subscriber.service"
import { CompressorContract } from "./compressor.contract"
import { RequestCompressionDto } from "./dto/request-compression.dto"
import { isTerminal, toCompressionResponse } from "./compression.mapper"
import { ConfirmUploadDto } from "./dto/confirm-upload.dto"
import * as Sentry from "@sentry/nestjs"
import { CompressionProducer } from "./compression.producer"
import { RequestDownloadDto } from "./dto/request-download.dto"
// Safety poll: re-read the DB even when no Redis ping arrives, so a lost
// PUBLISH can't strand a stream on a stale state.
const POLL_MS = 20_000

@Injectable()
export class CompressorService {
    constructor(
        private readonly s3: S3Service,
        private readonly repository: CompressorContract,
        private readonly events: RedisSubscriberService,
        private readonly producer: CompressionProducer,
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

    async requestDownload(userId: string, dto: RequestDownloadDto) {
        const key = await this.repository.findOutputKeyById(userId, dto.compressionId)
        if (!key) throw new NotFoundException()
        return await this.s3.getDownloadUrl(key.outputKey)
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

        const read$ = () => from(this.repository.findOwnedById(userId, id)).pipe(filter((row) => row !== null))

        // Redis ping and safety poll both funnel through the same DB read — Redis
        return merge(
            this.events.channel(`compression:${id}`).pipe(switchMap(read$)),
            timer(0, POLL_MS).pipe(switchMap(read$)),
        ).pipe(
            // "QUEUED" is already known by the user client when it successfully calls confirm-upload endpoint. So no need to have an event for that again
            filter((row) => row.status !== "QUEUED"),
            distinctUntilChanged(
                (prev, current) =>
                    prev.status === current.status &&
                    prev.outputKey === current.outputKey &&
                    prev.error === current.error,
            ),
            takeWhile((row) => !isTerminal(row.status), true),
            map((row) => ({ data: toCompressionResponse(row) }) satisfies MessageEvent),
        )
    }

    async confirmUpload(userId: string, dto: ConfirmUploadDto) {
        const key = await this.repository.findSourceKeyById(userId, dto.compressionId)
        if (!key?.sourceKey) {
            Sentry.captureMessage("User sent invalid source key")
            throw new NotFoundException()
        }
        const ContentLength = await this.s3.getObjectSourceSize(key.sourceKey)

        if (ContentLength === null) {
            Sentry.captureMessage("User sent content length with null or 0 value")
            throw new NotFoundException()
        }

        // Will try to update compression status
        await this.repository.updateStatusById(userId, dto.compressionId, ContentLength)

        // Calls producer to enqueue the compression by ID
        await this.producer.enqueue(dto.compressionId)
    }
}
