import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { CourseRepository } from '../../repositories/course.repository';
import { CourseRejectedEvent } from '../events/course-rejected.event';
import { RejectCourseCommand } from './reject-course.command';

@CommandHandler(RejectCourseCommand)
export class RejectCourseHandler implements ICommandHandler<RejectCourseCommand> {
  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: RejectCourseCommand) {
    const { courseId, reason } = command;
    const course = await this.courseRepository.findById(courseId);
    if (!course) throw new NotFoundException('Course not found');

    const updated = await this.courseRepository.reject(courseId, reason);

    this.eventBus.publish(new CourseRejectedEvent(courseId, course.title, course.teacherId, reason));
    return updated;
  }
}
