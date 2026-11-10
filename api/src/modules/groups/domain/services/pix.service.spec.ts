import { buildPixPayload, crc16, sanitizePixText } from './pix.service';

/** Decodifica TLV de primeiro nível. */
function parseTlv(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  let i = 0;
  while (i < s.length) {
    const id = s.slice(i, i + 2);
    const len = Number(s.slice(i + 2, i + 4));
    out[id] = s.slice(i + 4, i + 4 + len);
    i += 4 + len;
  }
  return out;
}

describe('PIX BR Code', () => {
  it('CRC16-CCITT-FALSE do vetor conhecido "123456789" == 29B1', () => {
    expect(crc16('123456789')).toBe('29B1');
  });

  it('gera payload com estrutura TLV válida e CRC correto', () => {
    const payload = buildPixPayload({
      key: 'fulano@example.com',
      merchantName: 'João da Silva',
      amountCents: 1234,
    });
    expect(payload.startsWith('000201')).toBe(true);
    expect(payload).toContain('br.gov.bcb.pix');
    const body = payload.slice(0, -4);
    expect(body.endsWith('6304')).toBe(true);
    expect(payload.slice(-4)).toBe(crc16(body));

    const f = parseTlv(payload);
    expect(f['00']).toBe('01');
    expect(parseTlv(f['26'])).toEqual({ '00': 'br.gov.bcb.pix', '01': 'fulano@example.com' });
    expect(f['52']).toBe('0000');
    expect(f['53']).toBe('986');
    expect(f['54']).toBe('12.34');
    expect(f['58']).toBe('BR');
    expect(f['59']).toBe('JOAO DA SILVA');
    expect(f['60']).toBe('BRASIL');
    expect(parseTlv(f['62'])).toEqual({ '05': '***' });
    expect(f['63']).toMatch(/^[0-9A-F]{4}$/);
  });

  it('nome sem acentos, maiúsculo e truncado em 25', () => {
    const payload = buildPixPayload({
      key: '+5511999999999',
      merchantName: 'Ângela Conceição Araújo de Assunção',
      amountCents: 100,
    });
    const name = parseTlv(payload)['59'];
    expect(name.length).toBeLessThanOrEqual(25);
    expect(name).toBe('ANGELA CONCEICAO ARAUJO D');
    expect(sanitizePixText('São Paulo', 15)).toBe('SAO PAULO');
  });

  it('omite o campo 54 quando valor é zero e formata centavos corretamente', () => {
    expect(parseTlv(buildPixPayload({ key: 'k', merchantName: 'A' }))['54']).toBeUndefined();
    expect(parseTlv(buildPixPayload({ key: 'k', merchantName: 'A', amountCents: 5 }))['54']).toBe('0.05');
    expect(parseTlv(buildPixPayload({ key: 'k', merchantName: 'A', amountCents: 400000 }))['54']).toBe('4000.00');
  });
});
