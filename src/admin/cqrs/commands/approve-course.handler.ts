import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { CourseRepository } from '../../repositories/course.repository';
import { CourseApprovedEvent } from '../events/course-approved.event';
import { ApproveCourseCommand } from './approve-course.command';

@CommandHandler(ApproveCourseCommand)
export class ApproveCourseHandler implements ICommandHandler<ApproveCourseCommand> {
  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: ApproveCourseCommand) {
    const { courseId } = command;
    const course = await this.courseRepository.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');

    const updated = await this.courseRepository.approve(courseId);

    this.eventBus.publish(new CourseApprovedEvent(courseId, course.title, course.teacherId));
    return updated;
  }
}
