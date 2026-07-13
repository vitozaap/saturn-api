import { Module } from "@nestjs/common";
import { AwsModule } from "../aws/aws.module";
import { PrismaModule } from "../../db/prisma.module";
import { CleanupService } from "./cleanup.service";


@Module({
    imports: [AwsModule],
    providers: [CleanupService],
})
export class CleanupModule { }