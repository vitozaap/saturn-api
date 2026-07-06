import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty, IsString, Matches, MaxLength } from "class-validator"

export class RequestCompressionDto {
    @ApiProperty({ maxLength: 255, description: "Original file name; embedded in the S3 upload key.", example: "vacation.mp4" })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    filename: string;

    @ApiProperty({ pattern: "^video/", description: "MIME type; must be a video/* type.", example: "video/mp4" })
    @IsString() @Matches(/^video\//)
    contentType: string

}