import { Compression } from "../../db/generated/prisma/client";
import { RequestCompressionDto } from "./dto/request-compression.dto";


export abstract class CompressorContract {
    abstract saveCompression(userId: string, sourceKey: string, dto: RequestCompressionDto): Promise<{ id: string }>
    abstract findManyByUser(userId: string): Promise<Compression[]>
    abstract findOwnedById(userId: string, id: string): Promise<Compression | null>
}