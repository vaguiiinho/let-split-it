/** Usuário autenticado que executa um Use Case (apenas primitivos). */
export type Actor = { userId: string; personId: string; role: 'USER' | 'ADMIN' };
