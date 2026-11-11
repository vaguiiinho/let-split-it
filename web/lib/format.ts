/** Datas exibidas no fuso do Brasil (mesmo da agregação mensal do dashboard), independentemente do servidor. */
const TZ = 'America/Sao_Paulo';

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: TZ });

export const timeFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TZ,
});

export const initial = (name: string) => name.trim().charAt(0).toUpperCase();
