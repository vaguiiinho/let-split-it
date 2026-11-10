import { describe, expect, it } from 'vitest';
import type { Settlement } from './types';
import { buildWhatsAppSummary } from './whatsapp';

const norm = (s: string) => s.replace(/ /g, ' ');

const settlement: Settlement = {
  totalCents: 12000,
  balances: [],
  transfers: [
    { fromId: 'c', fromName: 'Carla', toId: 'a', toName: 'Ana', amountCents: 4000, pixPayload: '00020126PIXDAANA6304ABCD' },
    { fromId: 'b', fromName: 'Bruno', toId: 'a', toName: 'Ana', amountCents: 1000, pixPayload: null },
  ],
};

describe('buildWhatsAppSummary', () => {
  it('lista as transferências com valores e PIX quando houver', () => {
    const text = norm(buildWhatsAppSummary('Churras do Zé', settlement));
    expect(text).toContain('🍻 *Racha Aí — Churras do Zé*');
    expect(text).toContain('Total do rolê: *R$ 120,00*');
    expect(text).toContain('2 transferências');
    expect(text).toContain('Carla paga *R$ 40,00* pra Ana');
    expect(text).toContain('Bruno paga *R$ 10,00* pra Ana');
    expect(text).toContain('00020126PIXDAANA6304ABCD');
    expect(text.match(/PIX copia e cola/g)).toHaveLength(1);
    // PIX vem logo depois da transferência correspondente
    expect(text.indexOf('00020126PIXDAANA6304ABCD')).toBeLessThan(text.indexOf('Bruno paga'));
  });

  it('usa singular com uma transferência', () => {
    const text = buildWhatsAppSummary('X', { ...settlement, transfers: settlement.transfers.slice(1) });
    expect(text).toContain('1 transferência)');
    expect(text).not.toContain('PIX copia e cola');
  });

  it('comemora quando não há nada a acertar', () => {
    const text = buildWhatsAppSummary('Vazio', { totalCents: 0, balances: [], transfers: [] });
    expect(text).toContain('Tudo quitado');
    expect(text).not.toContain('paga');
  });

  it('após pagamento parcial, mostra só o restante e mantém o total das despesas', () => {
    const rest: Settlement = {
      totalCents: 12000,
      balances: [],
      transfers: [{ fromId: 'c', fromName: 'Carla', toId: 'a', toName: 'Ana', amountCents: 2500, pixPayload: null }],
    };
    const text = norm(buildWhatsAppSummary('X', rest));
    expect(text).toContain('Total do rolê: *R$ 120,00*');
    expect(text).toContain('1 transferência)');
    expect(text).toContain('Carla paga *R$ 25,00* pra Ana');
    expect(text).not.toContain('R$ 40,00');
  });
});
