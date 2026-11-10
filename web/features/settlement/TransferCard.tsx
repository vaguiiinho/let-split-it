'use client';

import QRCode from 'qrcode';
import { useState } from 'react';
import { useCopy } from '@/features/ui/useCopy';
import { formatBRL } from '@/lib/money';
import type { Transfer } from '@/lib/types';

export function TransferCard({ transfer }: { transfer: Transfer }) {
  const { status, copy } = useCopy();
  const [qr, setQr] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);
  const { pixPayload } = transfer;

  async function onToggle(e: React.SyntheticEvent<HTMLDetailsElement>) {
    if (!e.currentTarget.open || qr || !pixPayload) return;
    try {
      setQr(await QRCode.toDataURL(pixPayload, { margin: 1, width: 240, errorCorrectionLevel: 'M' }));
    } catch {
      setQrError(true);
    }
  }

  return (
    <article className="rounded-xl border-2 border-line bg-surface p-3 shadow-sticker-sm sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 font-bold break-words">
          {transfer.fromName} <span aria-label="paga para">→</span> {transfer.toName}
        </p>
        <p className="rounded-lg border-2 border-line bg-accent px-2 py-0.5 text-lg font-black text-accent-ink tabular-nums">
          {formatBRL(transfer.amountCents)}
        </p>
      </div>

      {pixPayload ? (
        <div className="mt-3 space-y-2">
          <label className="block">
            <span className="text-xs font-bold text-muted">PIX copia e cola</span>
            <input
              readOnly
              value={pixPayload}
              onFocus={(e) => e.currentTarget.select()}
              className="input mt-1 min-h-9 font-mono text-xs"
            />
          </label>
          <div className="flex flex-wrap items-start gap-2">
            <button type="button" className="btn btn-primary text-sm" onClick={() => copy(pixPayload)}>
              {status === 'copied' ? '✓ Copiado!' : '📋 Copiar PIX'}
            </button>
            <details className="group" onToggle={onToggle}>
              <summary className="btn btn-ghost cursor-pointer list-none text-sm [&::-webkit-details-marker]:hidden">
                <span className="group-open:hidden">▦ Ver QR Code</span>
                <span className="hidden group-open:inline">Esconder QR</span>
              </summary>
              <div className="mt-3 inline-block rounded-xl border-2 border-line bg-white p-2">
                {qr ? (
                  // eslint-disable-next-line @next/next/no-img-element -- dataURL gerado no cliente
                  <img src={qr} width={200} height={200} alt={`QR Code PIX de ${formatBRL(transfer.amountCents)} para ${transfer.toName}`} />
                ) : (
                  <p className="grid size-[200px] place-items-center text-sm text-[#1e1a2b]">
                    {qrError ? 'Não deu pra gerar o QR 😕' : 'Gerando…'}
                  </p>
                )}
              </div>
            </details>
          </div>
          <p aria-live="polite" className="sr-only">
            {status === 'copied' ? 'PIX copiado' : status === 'failed' ? 'Não foi possível copiar' : ''}
          </p>
          {status === 'failed' && <p className="text-sm font-semibold text-neg">Não consegui copiar — selecione o texto acima.</p>}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">{transfer.toName} não cadastrou chave PIX — combina direto com ela(e). 🙂</p>
      )}
    </article>
  );
}
