import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsUUID } from "class-validator";


export class RequestDownloadDto {
    @IsUUID()
    @IsNotEmpty()
    @ApiProperty({ format: "uuid", description: "uuid of the compression to be downloaded.", example: "018f8a1e-7b2c-7000-8000-1c2d3e4f5a6b" })
    compressionId: string
}