import { AUTH_CONFIG } from "./symbols";
import { PrismaService } from "../../db/prisma.service";
import { ConfigService } from "@nestjs/config";
import { betterAuth } from "better-auth/minimal";
import { anonymous, openAPI } from "better-auth/plugins";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import type { Env } from "../env";



export const AuthConfigService = {
    provide: AUTH_CONFIG,
    inject: [PrismaService, ConfigService],
    useFactory: (prisma: PrismaService, config: ConfigService<Env>) => {
        return betterAuth({
            plugins: [anonymous(), openAPI({ disableDefaultReference: true })],
            trustedOrigins: [config.getOrThrow("WEB_URL")],
            secret: config.getOrThrow("BETTER_AUTH_SECRET"),
            database: prismaAdapter(prisma, {
                provider: 'postgresql'
            })
        })
    }
}