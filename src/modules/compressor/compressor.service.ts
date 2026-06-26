import { Injectable } from "@nestjs/common";
import { S3Service } from "../aws/s3.service";
import { CompressorContract } from "./compressor.contract";
import { RequestCompressionDto } from "./dto/request-compression.dto";


@Injectable()
export class CompressorService {
    constructor(private readonly s3: S3Service, private readonly repository: CompressorContract) { }

    async requestCompression(userId: string, dto: RequestCompressionDto) {
        const sourceKey = this.s3.generateSourceKey(userId, dto.filename)
        const compression = await this.repository.saveCompression(userId, sourceKey, dto)
        const uploadUrl = await this.s3.getUploadUrl({ key: sourceKey, contentType: dto.contentType })
        return {
            compressionId: compression.id,
            uploadUrl,
            sourceKey,
        }
    }
}