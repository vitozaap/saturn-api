import { applyDecorators } from "@nestjs/common";
import { ApiUnauthorizedResponse } from "@nestjs/swagger";

// Documents the response better-auth returns when a protected endpoint is hit
// without a valid session. The global AuthGuard throws before the handler runs,
// so the body is better-auth's shape, not ours. Apply to any protected route
// (or controller) so the 401 is documented once, in one place.
export const ApiAuthErrors = () =>
    applyDecorators(
        ApiUnauthorizedResponse({
            description: "Missing or invalid session — returned by better-auth's guard.",
            schema: {
                example: { code: "UNAUTHORIZED", message: "Unauthorized" },
            },
        }),
    );
