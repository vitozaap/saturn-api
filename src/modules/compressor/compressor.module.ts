import { Module } from "@nestjs/common"
import { CompressorController } from "./compressor.controller"
import { CompressorService } from "./compressor.service"
import { CompressorContract } from "./compressor.contract"
import { CompressorRepository } from "./compressor.repository"
import { AwsModule } from "../aws/aws.module"
import { BullModule } from "@nestjs/bullmq"
import { COMPRESSIONS_QUEUE } from "./compressor.queue"
import { CompressionProducer } from "./compression.producer"

@Module({
    imports: [
        AwsModule,
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
