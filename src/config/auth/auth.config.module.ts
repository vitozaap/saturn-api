import { AuthConfigService } from "./auth.config.service";
import { AUTH_CONFIG } from "./symbols";
import { Module } from "@nestjs/common";
import { ResendModule } from "../../modules/resend/resend.module";

@Module({
	imports: [ResendModule],
	providers: [AuthConfigService],
	exports: [AUTH_CONFIG],
})
export class AuthConfigModule {}
