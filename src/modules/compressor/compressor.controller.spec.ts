import { beforeEach, describe, expect, it, vi } from "vitest";
import { CompressorController } from "./compressor.controller";
import { Test } from "@nestjs/testing";
import { CompressorService } from "./compressor.service";
import { RequestCompressionDto } from "./dto/request-compression.dto";
import { UserSession } from "@thallesp/nestjs-better-auth";


describe("CompressorController", () => {
    let compressorController: CompressorController
    const mockService = {
        requestCompression: vi.fn().mockResolvedValue({
            compressionId: "comp-1",
            uploadUrl: "https://url",
            sourceKey: "tmp/u1/comp-1/v.mp4"
        })
    }
    beforeEach(async () => {
        vi.clearAllMocks()
        const moduleRef = await Test.createTestingModule({
            controllers: [CompressorController],
            providers: [{
                provide: CompressorService,
                useValue: mockService
            }]
        }).compile()
        compressorController = moduleRef.get(CompressorController)
    })

    describe("requestCompression", () => {
        it("Should not use userId from body", async () => {
            const evilDto = {
                contentType: "video/mp4",
                filename: "v.mp4",
                userId: "evil-userId"
            }
            const session = {
                user: {
                    id: "userId-from-session",
                }
            } as any
            await compressorController.requestCompression(evilDto, session)
            expect(mockService.requestCompression).toHaveBeenCalledWith("userId-from-session", evilDto)
        })
        it("Should return the same object as service", async () => {
            const dto = {
                contentType: "video/mp4",
                filename: "v.mp4"
            }
            const session = { user: { id: "userId" } } as any
            const result = await compressorController.requestCompression(dto, session)
            expect(mockService.requestCompression).toHaveBeenCalledOnce()
            expect(result).toEqual(await mockService.requestCompression())
        })
    })
})