import type { PrismaService } from "../../db/prisma.service";


export async function migrateAnonymousUserData(prisma: PrismaService, anonId: string, newUserId: string) {
    await prisma.compression.updateMany({
        where: {
            userId: anonId
        },
        data: {
            userId: newUserId
        }
    })
}