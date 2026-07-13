import { beforeEach, describe, vi, it, expect } from "vitest"
import { firstValueFrom, Subject, toArray } from "rxjs"
import { NotFoundException } from "@nestjs/common"
import { CompressorService } from "./compressor.service"
import { Test } from "@nestjs/testing"
import { S3Service } from "../aws/s3.service"
import { CompressorContract } from "./compressor.contract"
import { RedisSubscriberService } from "../../db/redis.subscriber.service"
import { Compression } from "../../db/generated/prisma/client"
import { RequestCompressionDto } from "./dto/request-compression.dto"

function makeRow(overrides: Partial<Compression> = {}): Compression {
    return {
        id: "comp-1",
        userId: "u1",
        filename: "v.mp4",
        status: "QUEUED",
        contentType: "video/mp4",
        sourceKey: "uploads/u1/k/v.mp4",
        sourceSize: null,
        outputKey: null,
        outputSize: null,
        preset: "MID",
        error: null,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
        completedAt: null,
        ...overrides,
    }
}

describe("CompressorService", () => {
    let compressorService: CompressorService
    const mockS3 = {
        getUploadUrl: vi.fn(),
        generateSourceKey: vi.fn(),
        getObjectSourceSize: vi.fn(),
    }
    const mockCompressorRepository = {
        saveCompression: vi.fn().mockResolvedValue({ id: "comp-1" }),
        findManyByUser: vi.fn(),
        findOwnedById: vi.fn(),
        updateStatusById: vi.fn(),
        findSourceKeyById: vi.fn(),
    } satisfies CompressorContract
    const mockEvents = {
        channel: vi.fn(() => new Subject<string>()),
    }

    beforeEach(async () => {
        vi.clearAllMocks()
        mockEvents.channel.mockImplementation(() => new Subject<string>())
        const moduleRef = await Test.createTestingModule({
            providers: [
                CompressorService,
                {
                    provide: S3Service,
                    useValue: mockS3,
                },
                {
                    provide: CompressorContract,
                    useValue: mockCompressorRepository,
                },
                {
                    provide: RedisSubscriberService,
                    useValue: mockEvents,
                },
            ],
        }).compile()
        compressorService = moduleRef.get(CompressorService)
    })

    describe("requestCompression", () => {
        it("Should generates a key, save the compression into the db and request a upload Url, then returns it", async () => {
            const dto: RequestCompressionDto = { filename: "v.mp4", contentType: "video/mp4", preset: "MID" }
            mockS3.getUploadUrl.mockResolvedValue("https://signed")
            mockS3.generateSourceKey.mockReturnValue("tmp/u1/key/v.mp4")
            const result = await compressorService.requestCompression("u1", dto)
            expect(mockCompressorRepository.saveCompression).toHaveBeenCalledWith("u1", "tmp/u1/key/v.mp4", dto)
            expect(mockS3.getUploadUrl).toHaveBeenCalledWith({
                key: "tmp/u1/key/v.mp4",
                contentType: "video/mp4",
            })
            expect(result).toEqual({
                compressionId: "comp-1",
                uploadUrl: "https://signed",
                sourceKey: "tmp/u1/key/v.mp4",
            })
        })
    })

    describe("listCompressions", () => {
        it("Should returns the user's compressions mapped to the response shape", async () => {
            mockCompressorRepository.findManyByUser.mockResolvedValue([makeRow({ status: "QUEUED", sourceSize: 100n })])
            const res = await compressorService.listCompressions("u1")
            expect(mockCompressorRepository.findManyByUser).toHaveBeenCalledWith("u1")
            expect(res[0]).toMatchObject({ status: "QUEUED", sourceSize: "100", outputSize: null, ratio: null })
        })
    })

    describe("streamCompression", () => {
        it("Should throw NotFound when the compression is missing or not owned", async () => {
            mockCompressorRepository.findOwnedById.mockResolvedValue(null)
            await expect(compressorService.streamCompression("u1", "x")).rejects.toBeInstanceOf(NotFoundException)
        })

        it("Should emit the snapshot and closes when the state is already terminal", async () => {
            const row = makeRow({ status: "COMPLETED", sourceSize: 100n, outputSize: 40n })
            mockCompressorRepository.findOwnedById.mockResolvedValue(row)
            const obs = await compressorService.streamCompression("u1", "comp-1")
            const events = await firstValueFrom(obs.pipe(toArray()))
            expect(events).toHaveLength(1)
            expect(events[0].data).toMatchObject({
                status: "COMPLETED",
                sourceSize: "100",
                outputSize: "40",
                ratio: 0.4,
            })
        })

        it("Should re-read on a Redis ping and closes once it reaches a terminal state", async () => {
            const pings = new Subject<string>()
            mockEvents.channel.mockReturnValue(pings)
            mockCompressorRepository.findOwnedById
                .mockResolvedValueOnce(makeRow({ status: "PROCESSING" })) // ownership check
                .mockResolvedValueOnce(makeRow({ status: "PROCESSING" })) // t=0 safety poll
                .mockResolvedValue(makeRow({ status: "COMPLETED", sourceSize: 100n, outputSize: 40n }))

            const obs = await compressorService.streamCompression("u1", "comp-1")
            const collected: { data: { status: string } }[] = []
            const done = new Promise<void>((resolve) =>
                obs.subscribe({ next: (e) => collected.push(e as any), complete: resolve }),
            )
            await new Promise((r) => setTimeout(r, 5)) // let the t=0 poll emit PROCESSING
            pings.next("queued")
            await done

            expect(collected.map((e) => e.data.status)).toEqual(["PROCESSING", "COMPLETED"])
            expect(mockEvents.channel).toHaveBeenCalledWith("compression:comp-1")
        })
    })

    describe("ConfirmUpload", () => {
        it("Should throws a NotFoundException when key does not exist", async () => {
            mockCompressorRepository.findSourceKeyById.mockResolvedValue(null)
            mockS3.getObjectSourceSize.mockResolvedValue(1_000_000)
            mockCompressorRepository.updateStatusById.mockResolvedValue(null)
            await expect(compressorService.confirmUpload("user-id", { compressionId: "comp-id" })).rejects.toThrow(
                NotFoundException,
            )
        })

        it("Should throws a NotFoundException when ContentLength is null or 0", async () => {
            mockCompressorRepository.findSourceKeyById.mockResolvedValue("/key/test")
            mockS3.getObjectSourceSize.mockResolvedValue(0)
            mockCompressorRepository.updateStatusById.mockResolvedValue(null)
            await expect(compressorService.confirmUpload("user-id", { compressionId: "comp-id" })).rejects.toThrow(
                NotFoundException,
            )
            mockS3.getObjectSourceSize.mockResolvedValue(null)
            await expect(compressorService.confirmUpload("user-id", { compressionId: "comp-id" })).rejects.toThrow(
                NotFoundException,
            )
        })
    })
})
