import { ValidationError } from '../../../../shared/domain/errors';
import { GroupName } from './group-name.vo';

describe('GroupName', () => {
  it('aplica trim e aceita 1..60', () => {
    expect(GroupName.create('  Viagem ').value).toBe('Viagem');
    expect(GroupName.create('a').value).toBe('a');
    expect(GroupName.create('a'.repeat(60)).value).toHaveLength(60);
  });

  it('rejeita vazio, >60 e não-string', () => {
    expect(() => GroupName.create('   ')).toThrow('Nome do rolê deve ter entre 1 e 60 caracteres');
    expect(() => GroupName.create('a'.repeat(61))).toThrow(ValidationError);
    expect(() => GroupName.create(1)).toThrow('Nome do rolê é obrigatório');
  });
});
