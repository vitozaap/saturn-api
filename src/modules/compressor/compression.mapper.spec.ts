import { describe, it, expect } from "vitest"
import { isTerminal, toCompressionResponse } from "./compression.mapper"
import { Compression } from "../../db/generated/prisma/client"

function makeRow(overrides: Partial<Compression> = {}): Compression {
    return {
        id: "comp-1",
        userId: "u1",
        filename: "v.mp4",
        status: "PENDING_UPLOAD",
        contentType: "video/mp4",
        sourceKey: "uploads/u1/k/v.mp4",
        sourceSize: null,
        outputKey: null,
        outputSize: null,
        error: null,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-02"),
        completedAt: null,
        ...overrides,
    }
}

describe("toCompressionResponse", () => {
    it("Should serialize BigInt sizes as strings", () => {
        const res = toCompressionResponse(makeRow({ sourceSize: 9_000_000_000n, outputSize: 3_000_000_000n }))
        expect(res.sourceSize).toBe("9000000000")
        expect(res.outputSize).toBe("3000000000")
    })

    it("Should keep null sizes as null", () => {
        const res = toCompressionResponse(makeRow())
        expect(res.sourceSize).toBeNull()
        expect(res.outputSize).toBeNull()
        expect(res.ratio).toBeNull()
    })

    it("Should derive ratio only when both sizes are present", () => {
        expect(toCompressionResponse(makeRow({ sourceSize: 200n, outputSize: 50n })).ratio).toBe(0.25)
        expect(toCompressionResponse(makeRow({ sourceSize: 200n })).ratio).toBeNull()
        expect(toCompressionResponse(makeRow({ sourceSize: 0n, outputSize: 50n })).ratio).toBeNull()
    })

    it("Should omit internal keys", () => {
        const res = toCompressionResponse(makeRow({ outputKey: "compressed/u1/x" })) as Record<string, unknown>
        expect(res.sourceKey).toBeUndefined()
        expect(res.outputKey).toBeUndefined()
    })
})

describe("isTerminal", () => {
    it("Should set true only for COMPLETED and FAILED", () => {
        expect(isTerminal("COMPLETED")).toBe(true)
        expect(isTerminal("FAILED")).toBe(true)
        expect(isTerminal("PROCESSING")).toBe(false)
        expect(isTerminal("QUEUED")).toBe(false)
        expect(isTerminal("PENDING_UPLOAD")).toBe(false)
    })
})
