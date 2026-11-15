import { ValidationError } from '../../../../shared/domain/errors';

export type UserRoleValue = 'USER' | 'ADMIN';

export class UserRole {
  private constructor(readonly value: UserRoleValue) {}

  static create(raw?: unknown): UserRole {
    if (raw === undefined || raw === null) return new UserRole('USER');
    if (raw === 'USER' || raw === 'ADMIN') return new UserRole(raw);
    throw new ValidationError('Papel inválido');
  }

  get isAdmin(): boolean {
    return this.value === 'ADMIN';
  }
}
