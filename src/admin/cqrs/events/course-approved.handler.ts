import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { CourseApprovedEvent } from './course-approved.event';

@EventsHandler(CourseApprovedEvent)
export class CourseApprovedHandler implements IEventHandler<CourseApprovedEvent> {
  private readonly logger = new Logger(CourseApprovedHandler.name);

  async handle(event: CourseApprovedEvent) {
    this.logger.log(`Course ${event.courseId} (${event.courseTitle}) approved — notify teacher ${event.teacherId}`);
  }
}
