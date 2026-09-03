import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { UserRepository } from '../../repositories/user.repository';
import { GetAllUsersQuery } from './get-all-users.query';

@QueryHandler(GetAllUsersQuery)
export class GetAllUsersHandler implements IQueryHandler<GetAllUsersQuery> {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(query: GetAllUsersQuery) {
    return this.userRepository.findAll({
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
  }
}
