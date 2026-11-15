import { User } from '../../domain/user.entity';

export type UserOutput = {
  id: string;
  username: string;
  name: string;
  role: 'USER' | 'ADMIN';
  personId: string;
  isDemo: boolean;
  createdAt: string;
};

export function toUserOutput(user: User, name: string): UserOutput {
  return {
    id: user.id.value,
    username: user.username.value,
    name,
    role: user.role.value,
    personId: user.personId.value,
    isDemo: user.isDemo,
    createdAt: user.createdAt.toISOString(),
  };
}
