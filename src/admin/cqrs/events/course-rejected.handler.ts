import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { CourseRejectedEvent } from './course-rejected.event';

@EventsHandler(CourseRejectedEvent)
export class CourseRejectedHandler implements IEventHandler<CourseRejectedEvent> {
  private readonly logger = new Logger(CourseRejectedHandler.name);

  async handle(event: CourseRejectedEvent) {
    this.logger.log(`Course ${event.courseId} (${event.courseTitle}) rejected — notify teacher ${event.teacherId}. Reason: ${event.reason ?? 'none'}`);
  }
}
