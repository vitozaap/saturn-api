import { plainToInstance } from "class-transformer"
import { RequestCompressionDto } from "./request-compression.dto"
import { validate } from "class-validator"
import { describe, expect, it } from "vitest"

async function validateDto(payload: unknown) {
    const dto = plainToInstance(RequestCompressionDto, payload)
    return validate(dto)
}

describe("RequestCompressionDto", () => {
    const valid: RequestCompressionDto = { filename: "v.mp4", contentType: "video/mp4", preset: "MID" }

    it("Should accept a valid payload", async () => {
        const errors = await validateDto(valid)
        expect(errors).toHaveLength(0)
    })
    it("Should refuses a empty filename", async () => {
        const errors = await validateDto({ ...valid, filename: "" })
        expect(errors).toHaveLength(1)
        expect(errors[0].property).toBe("filename")
        expect(errors[0].constraints).toHaveProperty("isNotEmpty")
    })
    it("Should refuses filename with more than 255 characters", async () => {
        const errors = await validateDto({ ...valid, filename: "a".repeat(256) })
        expect(errors[0].property).toBe("filename")
        expect(errors[0].constraints).toHaveProperty("maxLength")
    })
    it("Should refuses invalid contentType formats (does not match 'video/')", async () => {
        const errors = await validateDto({ ...valid, contentType: "image/png" })
        expect(errors[0].property).toBe("contentType")
        expect(errors[0].constraints).toHaveProperty("matches")
    })

    it("Should refuses empty fields", async () => {
        const errors = await validateDto({})
        const props = errors.map((e) => e.property)
        expect(props).toContain("filename")
        expect(props).toContain("contentType")
    })
    it("Should refuses invalid preset", async () => {
        const errors = await validateDto({...valid, preset: "INVALID"})
        expect(errors[0].property).toBe("preset")
        expect(errors[0].constraints).toHaveProperty("isEnum")
    })
})