import { UserRepository } from '../../domain/user.repository';
import { toUserOutput, UserOutput } from '../dto/user.output';

export type ListUsersInput = Record<string, never>;
export type ListUsersOutput = UserOutput[];

export class ListUsersUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(_input: ListUsersInput = {}): Promise<ListUsersOutput> {
    const list = await this.users.list();
    return list.map((u) => toUserOutput(u.user, u.name));
  }
}
