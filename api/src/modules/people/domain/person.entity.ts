import { UniqueEntityId } from '../../../shared/domain/value-objects/unique-entity-id.vo';
import { PersonName } from './value-objects/person-name.vo';
import { PixKey } from './value-objects/pix-key.vo';

export interface PersonProps {
  name: PersonName;
  pixKey: PixKey | null;
}

/** Pessoa global: pode participar de vários rolês. */
export class Person {
  private constructor(
    readonly id: UniqueEntityId,
    private _name: PersonName,
    private _pixKey: PixKey | null,
    readonly createdAt: Date,
  ) {}

  static create(props: PersonProps, createdAt: Date, id?: UniqueEntityId): Person {
    return new Person(id ?? UniqueEntityId.create(), props.name, props.pixKey, createdAt);
  }

  static restore(props: PersonProps & { id: UniqueEntityId; createdAt: Date }): Person {
    return new Person(props.id, props.name, props.pixKey, props.createdAt);
  }

  get name(): PersonName {
    return this._name;
  }

  get pixKey(): PixKey | null {
    return this._pixKey;
  }

  rename(name: PersonName): void {
    this._name = name;
  }

  changePixKey(pixKey: PixKey | null): void {
    this._pixKey = pixKey;
  }
}
