import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { UserRoleChangedEvent } from './user-role-changed.event';

@EventsHandler(UserRoleChangedEvent)
export class UserRoleChangedHandler implements IEventHandler<UserRoleChangedEvent> {
  private readonly logger = new Logger(UserRoleChangedHandler.name);

  async handle(event: UserRoleChangedEvent) {
    this.logger.log(`User ${event.userId} role changed: ${event.oldRole} → ${event.newRole}`);
  }
}
