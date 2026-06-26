import { Module } from "@nestjs/common";
import { CompressorController } from "./compressor.controller";
import { CompressorService } from "./compressor.service";
import { CompressorContract } from "./compressor.contract";
import { CompressorRepository } from "./compressor.repository";
import { AwsModule } from "../aws/aws.module";


@Module({
    imports: [AwsModule],
    controllers: [CompressorController],
    providers: [
        CompressorService,
        {
            provide: CompressorContract,
            useClass: CompressorRepository
        }
    ]
})
export class CompressorModule { }