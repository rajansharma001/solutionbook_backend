import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AbilityFactory, AppAbility, PolicyHandlerCallback } from './ability.factory';
import { CHECK_POLICIES_KEY } from './check-policies.decorator';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly abilityFactory: AbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policyHandlers = this.reflector.getAllAndOverride<PolicyHandlerCallback[]>(
      CHECK_POLICIES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!policyHandlers || policyHandlers.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.sub) {
      throw new ForbiddenException('Authentication required');
    }

    const fullUser = {
      id: user.sub,
      email: user.email,
      role: user.role,
      name: user.name,
      passwordHash: '',
      isEmailVerified: true,
      isActive: true,
      verificationToken: null,
      verificationTokenExpires: null,
      profileData: null,
      profileImage: null,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      permissions: user.permissions,
    };

    const ability = this.abilityFactory.createForUser(fullUser);

    const hasPermission = policyHandlers.every((handler) => handler(ability));

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}