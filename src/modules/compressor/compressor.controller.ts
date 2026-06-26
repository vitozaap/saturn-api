import { Body, Controller, Post, Session } from "@nestjs/common";
import { RequestCompressionDto } from "./dto/request-compression.dto";
import { CompressorService } from "./compressor.service";
import { AllowAnonymous, UserSession } from "@thallesp/nestjs-better-auth";


@Controller("/compressor")
export class CompressorController {
    constructor(private readonly service: CompressorService) { }

    @Post()
    async requestCompression(@Body() requestCompressionDto: RequestCompressionDto, @Session() session: UserSession) {
        return await this.service.requestCompression(session.user.id, requestCompressionDto)
    }
}