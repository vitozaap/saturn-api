import { ConflictException, Injectable } from "@nestjs/common"
import { CompressorContract } from "./compressor.contract"
import { PrismaService } from "../../db/prisma.service"
import { RequestCompressionDto } from "./dto/request-compression.dto"

@Injectable()
export class CompressorRepository implements CompressorContract {
    constructor(private readonly prisma: PrismaService) { }
    async saveCompression(userId: string, sourceKey: string, dto: RequestCompressionDto) {
        return await this.prisma.compression.create({
            data: {
                filename: dto.filename,
                userId: userId,
                contentType: dto.contentType,
                preset: dto.preset,
                sourceKey: sourceKey,
            },
        })
    }
    async findOutputKeyById(userId: string, id: string): Promise<{ outputKey: string } | null> {
        const row = await this.prisma.compression.findFirst({
            where: {
                id: id,
                userId: userId,
                status: "COMPLETED"
            },
            select: {
                outputKey: true
            }
        })

        return !row?.outputKey ? null : { outputKey: row.outputKey }
    }

    async findManyByUser(userId: string) {
        return await this.prisma.compression.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        })
    }

    async findOwnedById(userId: string, id: string) {
        return await this.prisma.compression.findFirst({
            where: { id, userId },
        })
    }

    async findSourceKeyById(userId: string, id: string): Promise<{ sourceKey: string } | null> {
        return await this.prisma.compression.findFirst({
            where: { userId: userId, id: id },
            select: { sourceKey: true },
        })
    }

    async updateStatusById(userId: string, id: string, sourceSize: bigint): Promise<void> {
        const { count } = await this.prisma.compression.updateMany({
            where: { id: id, userId: userId, status: "PENDING_UPLOAD" },
            data: { sourceSize: sourceSize, status: "QUEUED" },
        })
        if (count === 0) throw new ConflictException()
    }
}
