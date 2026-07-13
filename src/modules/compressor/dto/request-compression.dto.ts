import { ApiProperty } from "@nestjs/swagger"
import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from "class-validator"
import { Preset } from "../../../db/generated/prisma/enums"


export class RequestCompressionDto {
    @ApiProperty({
        maxLength: 255,
        description: "Original file name; embedded in the S3 upload key.",
        example: "vacation.mp4",
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    filename: string

    @ApiProperty({ pattern: "^video/", description: "MIME type; must be a video/* type.", example: "video/mp4" })
    @IsString()
    @Matches(/^video\//)
    contentType: string

    @ApiProperty({
        enum: ["HIGH", "MID", "LOW"],
        description: "The preset FFmpeg will use when compressing the media.",
    })
    @IsEnum(Preset, { message: "Preset must be either HIGH or MID or LOW" })
    @IsOptional()
    preset: Preset
}
