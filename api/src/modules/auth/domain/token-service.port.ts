export type TokenClaims = { sub: string; role: 'USER' | 'ADMIN' };
export type VerifiedToken = TokenClaims & { exp: number };

export interface TokenService {
  sign(claims: TokenClaims): string;
  /** Token inválido/expirado → UnauthorizedError('Sessão expirada ou inválida'). */
  verify(token: string): VerifiedToken;
}

export const TOKEN_SERVICE = Symbol('TOKEN_SERVICE');
