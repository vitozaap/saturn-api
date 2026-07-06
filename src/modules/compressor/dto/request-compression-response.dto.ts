import { ApiProperty } from "@nestjs/swagger";

export class RequestCompressionResponseDto {
    @ApiProperty({ format: "uuid", description: "uuidv7 of the created compression row.", example: "018f8a1e-7b2c-7000-8000-1c2d3e4f5a6b" })
    compressionId: string;

    @ApiProperty({ description: "Presigned S3 PUT URL to upload the source video to.", example: "https://bucket.s3.sa-east-1.amazonaws.com/uploads/..." })
    uploadUrl: string;

    @ApiProperty({ description: "S3 object key the video will be stored under.", example: "uploads/user-id/compression-id/vacation.mp4" })
    sourceKey: string;
}
