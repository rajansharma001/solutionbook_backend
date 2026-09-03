import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../../repositories/user.repository';
import { UserRoleChangedEvent } from '../events/user-role-changed.event';
import { UpdateUserRoleCommand } from './update-user-role.command';

@CommandHandler(UpdateUserRoleCommand)
export class UpdateUserRoleHandler implements ICommandHandler<UpdateUserRoleCommand> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UpdateUserRoleCommand) {
    const { userId, role } = command;
    const validRoles = ['STUDENT', 'TEACHER', 'ADMIN'];
    if (!validRoles.includes(role)) {
      throw new BadRequestException(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const oldRole = user.role;
    const updated = await this.userRepository.updateRole(userId, role);

    this.eventBus.publish(new UserRoleChangedEvent(userId, oldRole, role));
    return updated;
  }
}
