import { AUTH_CONFIG } from "./symbols";
import { PrismaService } from "../../db/prisma.service";
import { ConfigService } from "@nestjs/config";
import { betterAuth } from "better-auth/minimal";
import { anonymous, emailOTP, openAPI } from "better-auth/plugins";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import type { Env } from "../env";
import { migrateAnonymousUserData } from "./migrate-anonymous";
import * as Sentry from "@sentry/nestjs";
import { ResendService } from "../../modules/resend/resend.service";

export const AuthConfigService = {
	provide: AUTH_CONFIG,
	inject: [PrismaService, ConfigService, ResendService],
	useFactory: (
		prisma: PrismaService,
		config: ConfigService<Env>,
		resend: ResendService,
	) => {
		return betterAuth({
			plugins: [
				anonymous({
					onLinkAccount: async ({ anonymousUser, newUser }) => {
						try {
							await migrateAnonymousUserData(
								prisma,
								anonymousUser.user.id,
								newUser.user.id,
							);
						} catch (err) {
							Sentry.captureException(err, {
								extra: {
									anonymousId: anonymousUser.user.id,
									newUserId: newUser.user.id,
								},
								tags: {
									feature: "anonymous-account-linking",
								},
							});
							throw err;
						}
					},
				}),
				emailOTP({
					overrideDefaultEmailVerification: true,
					async sendVerificationOTP({ email, otp, type }) {
						const from = "Squish <support@squish.digital>";
						switch (type) {
							case "email-verification":
								await resend.emails.send({
									from: from,
									to: email,
									subject: "SQUISH - Código de Uso Único",
									template: {
										id: "otp-code",
										variables: {
											code: otp,
										},
									},
								});
								break;
							case "forget-password":
								await resend.emails.send({
									from: from,
									to: email,
									subject: "SQUISH - Código de Uso Único",
									template: {
										id: "otp-code",
										variables: {
											code: otp,
										},
									},
								});
								break;
							case "change-email":
                                // TODO: "change email" email
								break;
							case "sign-in":
								// TODO: "sign-in" email
								break;
						}
					},
				}),
				openAPI({ disableDefaultReference: true }),
			],
			trustedOrigins: [config.getOrThrow("WEB_URL")],
			secret: config.getOrThrow("BETTER_AUTH_SECRET"),
			emailAndPassword: {
				enabled: true,
                requireEmailVerification: true
			},

			advanced: {
				cookiePrefix: "squish",
			},
			database: prismaAdapter(prisma, {
				provider: "postgresql",
			}),
		});
	},
};
