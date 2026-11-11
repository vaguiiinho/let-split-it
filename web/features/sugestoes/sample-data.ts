// TODO(remover-apos-escolha) — dados fictícios das sugestões de layout (spec 003, F6).

export const SAMPLE_TOTALS = {
  spentCents: 487_350,
  pendingCents: 62_480,
  settledCents: 131_900,
  groupCount: 6,
  peopleCount: 14,
};

export const SAMPLE_BY_GROUP = [
  { name: 'Viagem pra Ilhabela', totalCents: 214_000 },
  { name: 'República da Rua 7', totalCents: 118_350 },
  { name: 'Churrasco do Cadu', totalCents: 64_200 },
  { name: 'Pizza de sexta', totalCents: 38_800 },
];

export const SAMPLE_PEOPLE = [
  { name: 'Ana', paidCents: 152_000 },
  { name: 'Bia', paidCents: 98_400 },
  { name: 'Cadu', paidCents: 71_250 },
];

export const SAMPLE_GROUPS = [
  { name: 'Viagem pra Ilhabela', people: 6, status: 'pendente' as const },
  { name: 'Churrasco do Cadu', people: 9, status: 'quitado' as const },
  { name: 'Pizza de sexta', people: 4, status: 'pendente' as const },
];

export const SAMPLE_NAV = [
  { href: '#', label: 'Dashboard', icon: '📊', current: true },
  { href: '#', label: 'Rolês', icon: '🎉', current: false },
  { href: '#', label: 'Pessoas', icon: '🙋', current: false },
];
