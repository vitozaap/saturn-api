import { Module } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { validate } from "./config/env"
import { AuthModule } from "@thallesp/nestjs-better-auth"
import { AUTH_CONFIG } from "./config/auth/symbols"
import { AuthConfigModule } from "./config/auth/auth.config.module"
import type { BetterAuthOptions } from "better-auth"
import { CompressorModule } from "./modules/compressor/compressor.module"
import { PrismaModule } from "./db/prisma.module"
import { RedisModule } from "./db/redis.module"
import { SentryGlobalFilter, SentryModule } from "@sentry/nestjs/setup"
import { APP_FILTER } from "@nestjs/core"
@Module({
    imports: [
        SentryModule.forRoot(),
        ConfigModule.forRoot({
            isGlobal: true,
            validate: validate,
        }),
        CompressorModule,
        PrismaModule,
        RedisModule,
        AuthModule.forRootAsync({
            isGlobal: true,
            imports: [AuthConfigModule],
            inject: [AUTH_CONFIG],
            useFactory: (config: BetterAuthOptions) => ({ auth: config }),
        }),
    ],
    controllers: [],
    providers: [
        {
            provide: APP_FILTER,
            useClass: SentryGlobalFilter
        }
    ],
})
export class AppModule {}
