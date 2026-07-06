import { ApiProperty } from "@nestjs/swagger";
import { Compression, CompressionStatus } from "../../db/generated/prisma/client";


export class CompressionResponseDto {
    @ApiProperty({ format: "uuid", description: "uuidv7 identifier.", example: "018f8a1e-7b2c-7000-8000-1c2d3e4f5a6b" })
    id: string;

    @ApiProperty({ example: "vacation.mp4" })
    filename: string;

    @ApiProperty({ enum: CompressionStatus, example: CompressionStatus.PROCESSING })
    status: CompressionStatus;

    @ApiProperty({ example: "video/mp4" })
    contentType: string;

    @ApiProperty({ type: String, nullable: true, description: "Source size in bytes. BigInt serialized as a string.", example: "9000000000" })
    sourceSize: string | null;

    @ApiProperty({ type: String, nullable: true, description: "Output size in bytes. BigInt serialized as a string.", example: "3000000000" })
    outputSize: string | null;

    @ApiProperty({ type: Number, nullable: true, description: "Derived outputSize / sourceSize, never stored.", example: 0.33 })
    ratio: number | null;

    @ApiProperty({ type: String, nullable: true, description: "Failure reason, present only when status is FAILED." })
    error: string | null;

    @ApiProperty({ format: "date-time" })
    createdAt: Date;

    @ApiProperty({ format: "date-time" })
    updatedAt: Date;

    @ApiProperty({ format: "date-time", nullable: true })
    completedAt: Date | null;
}

// States after which a compression no longer changes — the SSE stream closes
// once one of these is reached.
export function isTerminal(status: CompressionStatus): boolean {
    return status === CompressionStatus.COMPLETED || status === CompressionStatus.FAILED;
}

export function toCompressionResponse(row: Compression): CompressionResponseDto {
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
