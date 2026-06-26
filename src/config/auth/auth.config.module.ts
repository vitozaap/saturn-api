import { AuthConfigService } from "./auth.config.service";
import { AUTH_CONFIG } from "./symbols";
import { PrismaService } from "../../db/prisma.service";
import { Module } from "@nestjs/common";


@Module({
    imports: [],
    providers: [PrismaService, AuthConfigService],
    exports: [AUTH_CONFIG]
})
export class AuthConfigModule { }