import { Compression } from "../../db/generated/prisma/client"
import { RequestCompressionDto } from "./dto/request-compression.dto"

export abstract class CompressorContract {
    abstract saveCompression(userId: string, sourceKey: string, dto: RequestCompressionDto): Promise<{ id: string }>
    abstract findManyByUser(userId: string): Promise<Compression[]>
    abstract findOwnedById(userId: string, id: string): Promise<Compression | null>
    abstract findSourceKeyById(userId: string, id: string): Promise<{ sourceKey: string } | null>
    abstract findOutputKeyById(userId: string, id: string): Promise<{ outputKey: string } | null>
    abstract updateStatusById(userId: string, id: string, sourceSize: bigint): Promise<void>
}
