import { RequestCompressionDto } from "./dto/request-compression.dto";


export abstract class CompressorContract {
    abstract saveCompression(userId: string, sourceKey: string, dto: RequestCompressionDto): Promise<{ id: string }>
}