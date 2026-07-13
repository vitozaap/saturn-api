import { CompressionStatus } from "../../db/generated/prisma/enums";


export abstract class CleanupContract {
    abstract findExpirableBefore(cutoff: Date, statuses: CompressionStatus[]): Promise<Array<{ id: string, sourceKey: string, outputKey: string | null }> | null>
    abstract setExpiredRows(rowIds: string[]): Promise<void>
}