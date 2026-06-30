import { Body, Controller, Get, MessageEvent, Param, Post, Session, Sse } from "@nestjs/common";
import { Observable } from "rxjs";
import { RequestCompressionDto } from "./dto/request-compression.dto";
import { CompressorService } from "./compressor.service";
import { UserSession } from "@thallesp/nestjs-better-auth";


@Controller("/compressor")
export class CompressorController {
    constructor(private readonly service: CompressorService) { }

    @Post()
    async requestCompression(@Body() requestCompressionDto: RequestCompressionDto, @Session() session: UserSession) {
        return await this.service.requestCompression(session.user.id, requestCompressionDto)
    }

    @Get()
    async list(@Session() session: UserSession) {
        return await this.service.listCompressions(session.user.id)
    }

    @Sse(":id/stream")
    async stream(@Param("id") id: string, @Session() session: UserSession): Promise<Observable<MessageEvent>> {
        return await this.service.streamCompression(session.user.id, id)
    }
}
