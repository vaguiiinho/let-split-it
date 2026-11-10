import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { MemberName } from '../value-objects/member-name.vo';
import { PixKey } from '../value-objects/pix-key.vo';

export interface MemberProps {
  name: MemberName;
  pixKey: PixKey | null;
}

export class Member {
  private constructor(
    readonly id: UniqueEntityId,
    readonly name: MemberName,
    readonly pixKey: PixKey | null,
  ) {}

  static create(props: MemberProps, id?: UniqueEntityId): Member {
    return new Member(id ?? UniqueEntityId.create(), props.name, props.pixKey);
  }

  static restore(props: MemberProps & { id: UniqueEntityId }): Member {
    return new Member(props.id, props.name, props.pixKey);
  }
}
