import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { anonymous, openAPI } from "better-auth/plugins";
import { createPrismaClient } from "./prisma";
import { env } from "../config/env";


export const auth = betterAuth({
    plugins: [anonymous(), openAPI({ disableDefaultReference: true })],
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.WEB_URL],
    database: prismaAdapter(createPrismaClient, {
        provider: "postgresql",
    })
})
