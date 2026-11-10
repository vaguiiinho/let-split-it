import { randomUUID } from 'node:crypto';
import { ValidationError } from '../errors';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Identificador UUID v4 compartilhado por todas as entidades. */
export class UniqueEntityId {
  private constructor(readonly value: string) {}

  static create(value?: string): UniqueEntityId {
    if (value === undefined) return new UniqueEntityId(randomUUID());
    if (typeof value !== 'string' || !UUID_V4.test(value)) {
      throw new ValidationError('Identificador inválido');
    }
    return new UniqueEntityId(value.toLowerCase());
  }

  equals(other: UniqueEntityId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
