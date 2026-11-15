/** Quais rolês um ator enxerga: todos (ADMIN) ou os que é dono/participante (R1). */
export type GroupScope = { kind: 'all' } | { kind: 'user'; userId: string; personId: string };
