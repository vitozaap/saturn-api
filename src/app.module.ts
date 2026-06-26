import { Module } from "@nestjs/common";
import { PrismaService } from "./db/prisma.service";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { validate, type Env } from "./config/env";
import { AuthModule } from "@thallesp/nestjs-better-auth"
import { AUTH_CONFIG } from "./config/auth/symbols";
import { AuthConfigModule } from "./config/auth/auth.config.module";
import type { BetterAuthOptions } from "better-auth";
import { CompressorModule } from "./modules/compressor/compressor.module";
import { AwsModule } from "./modules/aws/aws.module";
import { PrismaModule } from "./db/prisma.module";
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validate,
    }),
    CompressorModule,
    PrismaModule,
    AuthModule.forRootAsync({
      isGlobal: true,
      imports: [AuthConfigModule],
      inject: [AUTH_CONFIG],
      useFactory: (config: BetterAuthOptions) => ({ auth: config })
    })
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
