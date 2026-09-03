import { Module } from "@nestjs/common";
import { S3Module } from "../cloud/s3.module";
import { CleanupService } from "./cleanup.service";
import { CleanupContract } from "./cleanup.contract";
import { CleanupRepository } from "./cleanup.repository";


@Module({
    imports: [S3Module],
    providers: [CleanupService,
        {
            provide: CleanupContract,
            useClass: CleanupRepository
        }
    ],
})
export class CleanupModule { }