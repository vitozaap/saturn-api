import { IsNotEmpty, IsString, Matches, MaxLength } from "class-validator"

export class RequestCompressionDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    filename: string;

    @IsString() @Matches(/^video\//)
    contentType: string

}