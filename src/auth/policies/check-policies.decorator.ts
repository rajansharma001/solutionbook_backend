import { SetMetadata } from '@nestjs/common';
import { PolicyHandlerCallback } from './ability.factory';

export const CHECK_POLICIES_KEY = 'checkPolicies';
export const CheckPolicies = (...handlers: PolicyHandlerCallback[]) => SetMetadata(CHECK_POLICIES_KEY, handlers);