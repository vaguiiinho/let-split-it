import { Group } from '../../domain/group.aggregate';
import { Clock } from '../../domain/clock.port';
import { GroupRepository } from '../../domain/group.repository';
import { GroupName } from '../../domain/value-objects/group-name.vo';
import { GroupDetailOutput, toGroupDetailOutput } from '../dto/group-detail.output';

export type CreateGroupInput = { name: string };
export type CreateGroupOutput = GroupDetailOutput;

export class CreateGroupUseCase {
  constructor(
    private readonly repo: GroupRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateGroupInput): Promise<CreateGroupOutput> {
    const group = Group.create({ name: GroupName.create(input.name) }, this.clock.now());
    await this.repo.save(group);
    return toGroupDetailOutput(group);
  }
}
