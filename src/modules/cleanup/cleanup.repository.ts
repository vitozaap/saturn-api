import { Injectable } from "@nestjs/common";
import { CleanupContract } from "./cleanup.contract";
import { PrismaService } from "../../db/prisma.service";
import { CompressionStatus } from "../../db/generated/prisma/enums";

@Injectable()
export class CleanupRepository implements CleanupContract {
    constructor(private readonly prisma: PrismaService) { }
    async findExpirableBefore(cutoff: Date, statuses: CompressionStatus[]): Promise<Array<{ id: string, sourceKey: string; }> | null> {
        const stale = await this.prisma.compression.findMany({
            where: {
                status: { in: statuses },
                createdAt: { lt: cutoff },

            },
            select: {
                id: true,
                sourceKey: true,
                outputKey: true
            }
        })
        return stale
    }

    async setExpiredRows(rowIds: string[]) {
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