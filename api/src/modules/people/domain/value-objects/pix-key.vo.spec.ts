import { PixKey } from './pix-key.vo';

describe('PixKey', () => {
  it('vazio, nulo ou só espaços → null', () => {
    expect(PixKey.createOptional(undefined)).toBeNull();
    expect(PixKey.createOptional(null)).toBeNull();
    expect(PixKey.createOptional('')).toBeNull();
    expect(PixKey.createOptional('  ')).toBeNull();
  });

  it('aceita ASCII imprimível até 77', () => {
    expect(PixKey.createOptional(' ana@pix.com ')?.value).toBe('ana@pix.com');
    expect(PixKey.createOptional('k'.repeat(77))?.value).toHaveLength(77);
    expect(PixKey.createOptional('+5511999998888')).not.toBeNull();
  });

  it('rejeita >77, espaços, acentos e não-string', () => {
    expect(() => PixKey.createOptional('k'.repeat(78))).toThrow('Chave PIX deve ter no máximo 77 caracteres');
    expect(() => PixKey.createOptional('a b')).toThrow(/Chave PIX/);
    expect(() => PixKey.createOptional('joão@pix.com')).toThrow(/Chave PIX/);
    expect(() => PixKey.createOptional(5)).toThrow('Chave PIX inválida');
  });
});
