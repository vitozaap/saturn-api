import { AuthConfigService } from './auth.config.service';

export type AuthConfigType = ReturnType<
    (typeof AuthConfigService)['useFactory']
>;