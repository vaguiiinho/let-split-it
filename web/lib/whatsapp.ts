import { formatBRL } from './money';
import type { Settlement } from './types';

/** Monta o texto do acerto pronto para colar no WhatsApp (negrito com *...*). */
export function buildWhatsAppSummary(groupName: string, settlement: Settlement): string {
  const lines: string[] = [`🍻 *Racha Aí — ${groupName.trim()}*`, `💸 Total do rolê: *${formatBRL(settlement.totalCents)}*`, ''];

  if (settlement.transfers.length === 0) {
    lines.push('✅ Tudo quitado! Ninguém deve nada pra ninguém. 🎉');
  } else {
    const n = settlement.transfers.length;
    lines.push(`🔁 *Acerto (${n} ${n === 1 ? 'transferência' : 'transferências'}):*`);
    for (const t of settlement.transfers) {
      lines.push(`👉 ${t.fromName} paga *${formatBRL(t.amountCents)}* pra ${t.toName}`);
      if (t.pixPayload) {
        lines.push(`   📲 PIX copia e cola:`, `   ${t.pixPayload}`);
      }
    }
  }

  lines.push('', '_Feito no Racha Aí 🤙_');
  return lines.join('\n');
}
