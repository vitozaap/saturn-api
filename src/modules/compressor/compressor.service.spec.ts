import { beforeEach, describe, vi, it, expect } from "vitest";
import { CompressorService } from "./compressor.service";
import { Test } from "@nestjs/testing";
import { S3Service } from "../aws/s3.service";
import { CompressorContract } from "./compressor.contract";


describe("CompressorService", () => {
    let compressorService: CompressorService
    const mockS3 = {
        getUploadUrl: vi.fn(),
        generateSourceKey: vi.fn()
    }
    const mockCompressorRepository = {
        saveCompression: vi.fn().mockResolvedValue({ id: "comp-1" })
    } satisfies CompressorContract

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            providers: [CompressorService,
                {
                    provide: S3Service,
                    useValue: mockS3
                },
                {
                    provide: CompressorContract,
                    useValue: mockCompressorRepository
                }]
        }).compile()
        compressorService = moduleRef.get(CompressorService)
    })

    describe("requestCompression", () => {
        it("It should generates a key, save the compression into the db and request a upload Url, then returns it", async () => {
            const dto = { filename: "v.mp4", contentType: "video/mp4" }
            mockS3.getUploadUrl.mockResolvedValue("https://signed")
            mockS3.generateSourceKey.mockReturnValue("tmp/u1/key/v.mp4")
            const result = await compressorService.requestCompression("u1", dto)
            expect(mockCompressorRepository.saveCompression).toHaveBeenCalledWith("u1", "tmp/u1/key/v.mp4", dto)
            expect(mockS3.getUploadUrl).toHaveBeenCalledWith({
                key: "tmp/u1/key/v.mp4",
                contentType: "video/mp4"
            })
            expect(result).toEqual({
                compressionId: "comp-1",
                uploadUrl: "https://signed",
                sourceKey: "tmp/u1/key/v.mp4"
            })
        })
    })
})