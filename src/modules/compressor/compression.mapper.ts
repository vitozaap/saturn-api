import { Compression, CompressionStatus } from "../../db/generated/prisma/client";


export type CompressionResponse = {
    id: string;
    filename: string;
    status: CompressionStatus;
    contentType: string;
    // BigInt, so they go out as strings.
    sourceSize: string | null;
    outputSize: string | null;
    // Derived (outputSize / sourceSize), never stored.
    ratio: number | null;
    error: string | null;
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
};

// States after which a compression no longer changes — the SSE stream closes
// once one of these is reached.
export function isTerminal(status: CompressionStatus): boolean {
    return status === CompressionStatus.COMPLETED || status === CompressionStatus.FAILED;
}

export function toCompressionResponse(row: Compression): CompressionResponse {
    return {
        id: row.id,
        filename: row.filename,
        status: row.status,
        contentType: row.contentType,
        sourceSize: row.sourceSize?.toString() ?? null,
        outputSize: row.outputSize?.toString() ?? null,
        ratio:
            row.sourceSize != null && row.outputSize != null && row.sourceSize > 0n
                ? Number(row.outputSize) / Number(row.sourceSize)
                : null,
        error: row.error,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        completedAt: row.completedAt,
    };
}
