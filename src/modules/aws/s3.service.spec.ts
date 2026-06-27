import { beforeEach, describe, expect, it, vi } from "vitest"
import { S3Service } from "./s3.service"
import { Test } from "@nestjs/testing"
import { ConfigService } from "@nestjs/config"

describe("S3Service", () => {
    let s3service: S3Service
    const mockConfigService = {
        getOrThrow: vi.fn((key: string) => {
            if (key === "UPLOADS_PATH") {
                return "folder"
            }
            return null
        })
    }
    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [],
            providers: [S3Service, {
                provide: ConfigService,
                useValue: mockConfigService,
            }]
        }).compile()
        s3service = moduleRef.get(S3Service);
    })

    describe("SafeName", () => {
        it("Should remove slashes from filename", () => {
            const filename = "broken/filename"
            expect(s3service.safeName(filename)).toBe("broken_filename")
        })
    })

    describe("GenerateSourceKey", () => {
        it("should parse the filename correctly", () => {
            const filename = "broken/file/name"
            const mockUUID = "11111111-1111-4111-8111-111111111111"
            const userId = "00000000-0000-0000-0000-000000000000"
            const spyUUID = vi.spyOn(crypto, 'randomUUID').mockReturnValue(mockUUID)
            const fn = s3service.generateSourceKey(userId, filename)

            expect(mockConfigService.getOrThrow).toHaveBeenLastCalledWith("UPLOADS_PATH")
            expect(spyUUID).toHaveBeenCalledOnce()
            expect(fn).toBe(`folder/${userId}/${mockUUID}/broken_file_name`)

        })
    })
})