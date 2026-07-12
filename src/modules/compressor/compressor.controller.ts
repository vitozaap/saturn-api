import { Body, Controller, Get, HttpCode, HttpStatus, MessageEvent, Param, Post, Session, Sse } from "@nestjs/common"
import {
    ApiBadRequestResponse,
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
} from "@nestjs/swagger"
import { Observable } from "rxjs"
import { RequestCompressionDto } from "./dto/request-compression.dto"
import { RequestCompressionResponseDto } from "./dto/request-compression-response.dto"
import { CompressionResponseDto } from "./compression.mapper"
import { CompressorService } from "./compressor.service"
import { UserSession } from "@thallesp/nestjs-better-auth"
import { ApiAuthErrors } from "../../common/swagger.decorators"
import { ConfirmUploadDto } from "./dto/confirm-upload.dto"

@ApiTags("compressor")
@ApiAuthErrors()
@Controller("/compressor")
export class CompressorController {
    constructor(private readonly service: CompressorService) {}

    @Post()
    @ApiOperation({
        summary: "Request a compression",
        description:
            "Creates a PENDING_UPLOAD compression row and returns a presigned S3 URL to upload the source video to.",
    })
    @ApiCreatedResponse({ type: RequestCompressionResponseDto })
    @ApiBadRequestResponse({ description: "Validation failed (e.g. contentType is not a video/* type)." })
    async requestCompression(@Body() requestCompressionDto: RequestCompressionDto, @Session() session: UserSession) {
        return await this.service.requestCompression(session.user.id, requestCompressionDto)
    }

    @Get()
    @ApiOperation({
        summary: "List compressions",
        description: "Returns every compression owned by the authenticated user.",
    })
    @ApiOkResponse({ type: [CompressionResponseDto] })
    async list(@Session() session: UserSession) {
        return await this.service.listCompressions(session.user.id)
    }

    @Sse(":id/stream")
    @ApiOperation({
        summary: "Stream a compression's status",
        description:
            "Server-Sent Events stream (text/event-stream). Emits the compression on each status change and closes once it reaches COMPLETED or FAILED. Responds 404 if the compression does not exist or is not owned by the user.",
    })
    @ApiParam({ name: "id", format: "uuid", description: "Compression id." })
    @ApiOkResponse({
        type: CompressionResponseDto,
        description: "Each SSE event's data is the current compression state.",
    })
    @ApiNotFoundResponse({ description: "Compression not found or not owned by the user." })
    async stream(@Param("id") id: string, @Session() session: UserSession): Promise<Observable<MessageEvent>> {
        return await this.service.streamCompression(session.user.id, id)
    }

    @ApiOperation({
        summary: "Update compression status",
        description: "Updates a single compression status and its sourceSize.",
    })
    @ApiOkResponse({ description: "Compression status set to QUEUED." })
    @ApiNotFoundResponse({ description: "Uploaded file not found or not uploaded yet." })
    @ApiConflictResponse({ description: "Invalid ID, compression already queued or not existent." })
    @HttpCode(HttpStatus.OK)
    @Post("confirm-upload")
    async confirmUpload(@Body() confirmUploadDto: ConfirmUploadDto, @Session() session: UserSession) {
        return await this.service.confirmUpload(session.user.id, confirmUploadDto)
    }
}
