import { UniqueEntityId } from '../../../../shared/domain/value-objects/unique-entity-id.vo';
import { Person } from '../../../people/domain/person.entity';
import { PersonName } from '../../../people/domain/value-objects/person-name.vo';
import { PixKey } from '../../../people/domain/value-objects/pix-key.vo';

export interface MemberProps {
  /** Id da pessoa (o id do membro é o personId). */
  id: UniqueEntityId;
  name: PersonName;
  pixKey: PixKey | null;
}

/** Vínculo rolê + pessoa; guarda uma visão (snapshot) do nome e da chave PIX da Person. */
export class Member {
  private constructor(
    readonly id: UniqueEntityId,
    readonly name: PersonName,
    readonly pixKey: PixKey | null,
  ) {}

  static restore(props: MemberProps): Member {
    return new Member(props.id, props.name, props.pixKey);
  }

  static fromPerson(person: Person): Member {
    return new Member(person.id, person.name, person.pixKey);
  }
}
