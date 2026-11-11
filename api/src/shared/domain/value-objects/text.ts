import { ValidationError } from '../errors';

/** Valida string obrigatória com trim e tamanho 1..max. Mensagens preservadas do contrato. */
export function requireText(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string') throw new ValidationError(`${field} é obrigatório`);
  const v = value.trim();
  if (v.length < 1 || v.length > max) {
    throw new ValidationError(`${field} deve ter entre 1 e ${max} caracteres`);
  }
  return v;
}
