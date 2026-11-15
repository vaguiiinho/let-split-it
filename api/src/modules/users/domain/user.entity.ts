import { UniqueEntityId } from '../../../shared/domain/value-objects/unique-entity-id.vo';
import { UserRole } from './value-objects/user-role.vo';
import { Username } from './value-objects/username.vo';

export interface UserProps {
  username: Username;
  passwordHash: string;
  role: UserRole;
  personId: UniqueEntityId;
  /** Conta de demonstração (alvo da rotina de limpeza). */
  isDemo?: boolean;
}

/** Usuário do sistema, vinculado 1:1 a uma Person. */
export class User {
  private constructor(
    readonly id: UniqueEntityId,
    readonly username: Username,
    readonly passwordHash: string,
    readonly role: UserRole,
    readonly personId: UniqueEntityId,
    readonly createdAt: Date,
    readonly isDemo: boolean,
  ) {}

  static create(props: UserProps, createdAt: Date, id?: UniqueEntityId): User {
    return new User(
      id ?? UniqueEntityId.create(),
      props.username,
      props.passwordHash,
      props.role,
      props.personId,
      createdAt,
      props.isDemo ?? false,
    );
  }

  static restore(props: UserProps & { id: UniqueEntityId; createdAt: Date }): User {
    return new User(
      props.id,
      props.username,
      props.passwordHash,
      props.role,
      props.personId,
      props.createdAt,
      props.isDemo ?? false,
    );
  }

  /** Marca/desmarca como conta de demonstração (retorna nova instância). */
  withDemo(isDemo: boolean): User {
    return new User(
      this.id,
      this.username,
      this.passwordHash,
      this.role,
      this.personId,
      this.createdAt,
      isDemo,
    );
  }
}
