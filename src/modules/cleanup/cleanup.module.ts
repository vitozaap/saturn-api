import { Module } from "@nestjs/common";
import { AwsModule } from "../aws/aws.module";
import { PrismaModule } from "../../db/prisma.module";
import { CleanupService } from "./cleanup.service";
import { CleanupContract } from "./cleanup.contract";
import { CleanupRepository } from "./cleanup.repository";


@Module({
    imports: [AwsModule],
    providers: [CleanupService,
        {
            provide: CleanupContract,
            useClass: CleanupRepository
        }
    ],
})
export class CleanupModule { }