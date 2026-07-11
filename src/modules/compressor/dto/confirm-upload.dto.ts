import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";


export class ConfirmUploadDto {
    @ApiProperty({ format: "uuid", description: "id that points to the current compression you want to update status.", example: "018f8a1e-7b2c-7000-8000-1c2d3e4f5a6b" })
    @IsString()
    @IsNotEmpty()
    compressionId: string
}