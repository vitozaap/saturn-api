import { Module } from "@nestjs/common"
import { CompressorController } from "./compressor.controller"
import { CompressorService } from "./compressor.service"
import { CompressorContract } from "./compressor.contract"
import { CompressorRepository } from "./compressor.repository"
import { S3Module } from "../cloud/s3.module"
import { BullModule } from "@nestjs/bullmq"
import { COMPRESSIONS_QUEUE } from "./compressor.queue"
import { CompressionProducer } from "./compression.producer"

@Module({
    imports: [
        S3Module,
        BullModule.registerQueue({
            name: COMPRESSIONS_QUEUE,
        }),
    ],
    controllers: [CompressorController],
    providers: [
        CompressorService,
        CompressionProducer,
        {
            provide: CompressorContract,
            useClass: CompressorRepository,
        },
    ],
})
export class CompressorModule {}
