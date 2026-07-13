import { Injectable } from "@nestjs/common";
import { CleanupContract, ExpirableDateField } from "./cleanup.contract";
import { PrismaService } from "../../db/prisma.service";
import { CompressionStatus } from "../../db/generated/prisma/enums";
import { Stale } from "../aws/types";

@Injectable()
export class CleanupRepository implements CleanupContract {
    constructor(private readonly prisma: PrismaService) { }
    async findExpirableBefore(cutoff: Date, statuses: CompressionStatus[], dateField: ExpirableDateField): Promise<Stale[]> {
        const stale = await this.prisma.compression.findMany({
            where: {
                status: { in: statuses },
                // COMPLETED expires by completedAt (age since finish); the others by createdAt (age since upload attempt)
                [dateField]: { lt: cutoff },
            },
            select: {
                id: true,
                sourceKey: true,
                outputKey: true
            }
        })
        return stale
    }

    async setExpiredRows(rowIds: string[]): Promise<void> {
        if (rowIds.length === 0) return
        await this.prisma.compression.updateMany({
            data: {
                status: "EXPIRED"
            },
            where: {
                id: { in: rowIds }
            }
        })
    }
}