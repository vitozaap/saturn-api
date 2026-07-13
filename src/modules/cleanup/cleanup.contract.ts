import { CompressionStatus } from "../../db/generated/prisma/enums";
import { Stale } from "../aws/types";


export abstract class CleanupContract {
    abstract findExpirableBefore(cutoff: Date, statuses: CompressionStatus[]): Promise<Stale[] | null>
    abstract setExpiredRows(rowIds: string[]): Promise<void>
}