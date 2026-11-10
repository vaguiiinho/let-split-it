import { Money } from '../value-objects/money.vo';
import { ValidationError } from '../../../../shared/domain/errors';

/** CRC16-CCITT-FALSE (poly 0x1021, init 0xFFFF), 4 hex maiúsculos. */
export function crc16(payload: string): string {
  let crc = 0xffff;
  const bytes = Buffer.from(payload, 'utf8');
  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function tlv(id: string, value: string): string {
  const len = Buffer.byteLength(value, 'utf8');
  if (len > 99) throw new ValidationError(`Campo PIX ${id} excede 99 caracteres`);
  return `${id}${len.toString().padStart(2, '0')}${value}`;
}

/** Remove acentos, mantém apenas caracteres seguros, MAIÚSCULO e trunca. */
export function sanitizePixText(text: string, maxLength: number): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
    .slice(0, maxLength)
    .trim();
}

export interface PixPayloadInput {
  key: string;
  merchantName: string;
  merchantCity?: string;
  amountCents?: number;
  txid?: string;
}

/** Gera o BR Code estático (PIX copia e cola). */
export function buildPixPayload(input: PixPayloadInput): string {
  const key = input.key.trim();
  if (!key) throw new ValidationError('Chave PIX obrigatória');
  const name = sanitizePixText(input.merchantName, 25) || 'RECEBEDOR';
  const city = sanitizePixText(input.merchantCity ?? '', 15) || 'BRASIL';
  const amount = Money.fromCents(input.amountCents ?? 0);

  let payload =
    tlv('00', '01') +
    tlv('26', tlv('00', 'br.gov.bcb.pix') + tlv('01', key)) +
    tlv('52', '0000') +
    tlv('53', '986') +
    (amount.isZero() ? '' : tlv('54', amount.toDecimalString())) +
    tlv('58', 'BR') +
    tlv('59', name) +
    tlv('60', city) +
    tlv('62', tlv('05', input.txid ?? '***'));
  payload += '6304';
  return payload + crc16(payload);
}
