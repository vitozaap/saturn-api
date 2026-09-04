import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";
import { Env } from "../../config/env";

@Injectable()
export class ResendService extends Resend {
	constructor(configService: ConfigService<Env>) {
		super(configService.getOrThrow("RESEND_API_KEY"));
	}
}
