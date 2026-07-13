import { CompressionStatus } from "../../db/generated/prisma/enums";
import { Stale } from "../aws/types";


export type ExpirableDateField = "createdAt" | "completedAt"

export abstract class CleanupContract {
    abstract findExpirableBefore(cutoff: Date, statuses: CompressionStatus[], dateField: ExpirableDateField): Promise<Stale[]>
    abstract setExpiredRows(rowIds: string[]): Promise<void>
}