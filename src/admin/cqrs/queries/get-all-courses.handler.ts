import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { CourseRepository } from '../../repositories/course.repository';
import { GetAllCoursesQuery } from './get-all-courses.query';

@QueryHandler(GetAllCoursesQuery)
export class GetAllCoursesHandler implements IQueryHandler<GetAllCoursesQuery> {
  constructor(private readonly courseRepository: CourseRepository) {}

  async execute(query: GetAllCoursesQuery) {
    return this.courseRepository.findAll({
      status: query.status,
      page: query.page,
      limit: query.limit,
    });
  }
}
