import { ValidationError } from '../errors';
import { UniqueEntityId } from './unique-entity-id.vo';

describe('UniqueEntityId', () => {
  it('gera um UUID v4 válido quando omitido', () => {
    const id = UniqueEntityId.create();
    expect(UniqueEntityId.create(id.value).equals(id)).toBe(true);
    expect(id.toString()).toBe(id.value);
  });

  it('aceita v4 e normaliza para minúsculas', () => {
    const id = UniqueEntityId.create('6BA7B810-9DAD-41D1-80B4-00C04FD430C8');
    expect(id.value).toBe('6ba7b810-9dad-41d1-80b4-00c04fd430c8');
  });

  it('rejeita valores inválidos e outras versões', () => {
    for (const bad of ['nao-existe', '', '6ba7b810-9dad-11d1-80b4-00c04fd430c8', '01890a5d-ac96-774b-bcce-b302099a8057']) {
      expect(() => UniqueEntityId.create(bad)).toThrow(ValidationError);
    }
    expect(() => UniqueEntityId.create('x')).toThrow('Identificador inválido');
  });

  it('equals distingue ids diferentes', () => {
    expect(UniqueEntityId.create().equals(UniqueEntityId.create())).toBe(false);
  });
});
