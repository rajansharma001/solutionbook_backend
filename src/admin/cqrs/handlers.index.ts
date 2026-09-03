import { ApproveCourseHandler } from './commands/approve-course.handler';
import { RejectCourseHandler } from './commands/reject-course.handler';
import { UpdateUserRoleHandler } from './commands/update-user-role.handler';
import { GetDashboardStatsHandler } from './queries/get-dashboard-stats.handler';
import { GetAllUsersHandler } from './queries/get-all-users.handler';
import { GetAllCoursesHandler } from './queries/get-all-courses.handler';
import { CourseApprovedHandler } from './events/course-approved.handler';
import { CourseRejectedHandler } from './events/course-rejected.handler';
import { UserRoleChangedHandler } from './events/user-role-changed.handler';

export const CommandHandlers = [
  ApproveCourseHandler,
  RejectCourseHandler,
  UpdateUserRoleHandler,
];

export const QueryHandlers = [
  GetDashboardStatsHandler,
  GetAllUsersHandler,
  GetAllCoursesHandler,
];

export const EventHandlers = [
  CourseApprovedHandler,
  CourseRejectedHandler,
  UserRoleChangedHandler,
];
