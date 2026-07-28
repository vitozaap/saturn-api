import { beforeEach, describe, vi, it, expect } from "vitest"
import { migrateAnonymousUserData } from "./migrate-anonymous"
import type { PrismaService } from "../../db/prisma.service"

describe("migrateAnonymousUserData", () => {
    const updateMany = vi.fn()
    const prisma = { compression: { updateMany } } as unknown as PrismaService

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("Should reassign every compression from the anonymous user to the new user", async () => {
        updateMany.mockResolvedValue({ count: 3 })

        await migrateAnonymousUserData(prisma, "anon-1", "user-1")

        expect(updateMany).toHaveBeenCalledTimes(1)
        expect(updateMany).toHaveBeenCalledWith({
            where: { userId: "anon-1" },
            data: { userId: "user-1" },
        })
    })

    it("Should propagate the error (fail-safe) when the reassignment fails", async () => {
        const error = new Error("db down")
        updateMany.mockRejectedValue(error)

        await expect(migrateAnonymousUserData(prisma, "anon-1", "user-1")).rejects.toBe(error)
    })
})
