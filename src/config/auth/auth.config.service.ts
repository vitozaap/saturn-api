import { AUTH_CONFIG } from "./symbols";
import { PrismaService } from "../../db/prisma.service";
import { ConfigService } from "@nestjs/config";
import { betterAuth } from "better-auth/minimal";
import { anonymous, openAPI } from "better-auth/plugins";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import type { Env } from "../env";
import { migrateAnonymousUserData } from "./migrate-anonymous";
import * as Sentry from "@sentry/nestjs"


export const AuthConfigService = {
    provide: AUTH_CONFIG,
    inject: [PrismaService, ConfigService],
    useFactory: (prisma: PrismaService, config: ConfigService<Env>) => {
        return betterAuth({
            plugins: [anonymous({
                onLinkAccount: async ({ anonymousUser, newUser }) => {
                    try {
                        await migrateAnonymousUserData(prisma, anonymousUser.user.id, newUser.user.id)
                    }
                    catch (err) {
                        Sentry.captureException(err, {
                            extra: {
                                anonymousId: anonymousUser.user.id,
                                newUserId: newUser.user.id
                            },
                            tags: {
                                feature: "anonymous-account-linking"
                            }
                        })
                        throw err
                    }
                }
            }), openAPI({ disableDefaultReference: true })],
            trustedOrigins: [config.getOrThrow("WEB_URL")],
            secret: config.getOrThrow("BETTER_AUTH_SECRET"),
            emailAndPassword: {
                enabled: true
            },
            advanced: {
                cookiePrefix: "squish",
            },
            database: prismaAdapter(prisma, {
                provider: 'postgresql'
            })
        })
    }
}