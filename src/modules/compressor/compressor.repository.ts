import { Injectable } from "@nestjs/common";
import { CompressorContract } from "./compressor.contract";
import { PrismaService } from "../../db/prisma.service";
import { RequestCompressionDto } from "./dto/request-compression.dto";


@Injectable()
export class CompressorRepository implements CompressorContract {
    constructor(private readonly prisma: PrismaService) { }
    async saveCompression(userId: string, sourceKey: string, dto: RequestCompressionDto) {
        return await this.prisma.compression.create({
            data: {
                filename: dto.filename,
                userId: userId,
                contentType: dto.contentType,
                sourceKey: sourceKey
            }
        })
    }

}