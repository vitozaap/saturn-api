import { AUTH_CONFIG } from "./symbols";
import { PrismaService } from "../../db/prisma.service";
import { ConfigService } from "@nestjs/config";
import { betterAuth } from "better-auth/minimal";
import { anonymous, openAPI } from "better-auth/plugins";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import type { Env } from "../env";
import { migrateAnonymousUserData } from "./migrate-anonymous";
import * as Sentry from "@sentry/nestjs";
import { ResendService } from "../../modules/resend/resend.service";

export const AuthConfigService = {
	provide: AUTH_CONFIG,
	inject: [PrismaService, ConfigService],
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
				openAPI({ disableDefaultReference: true }),
			],
			trustedOrigins: [config.getOrThrow("WEB_URL")],
			secret: config.getOrThrow("BETTER_AUTH_SECRET"),
			emailAndPassword: {
				enabled: true,
				requireEmailVerification: true,
				customSyntheticUser: ({ coreFields, additionalFields, id }) => ({
					...coreFields,
					isAnonymous: false,
					...additionalFields,
					id,
				}),
				sendResetPassword: async ({ url, user }) => {
					void (await resend.emails.send({
						from: "Squish <support@squish.digital>",
						to: user.email,
						subject: "Redefinição de Senha",
						template: {
							id: "reset-password",
							variables: {
								URL: url,
							},
						},
					}));
				},
			},
			emailVerification: {
				sendVerificationEmail: async ({ user, url }) => {
					void (await resend.emails.send({
						from: "Squish <support@squish.digital>",
						to: user.email,
						subject: "SQUISH - Verificação de conta",
						template: {
							id: "validate-email",
							variables: {
								URL: url,
							},
						},
					}));
				},
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
