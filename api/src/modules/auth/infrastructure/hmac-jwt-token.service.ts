import { createHmac, timingSafeEqual } from 'node:crypto';
import { Clock } from '../../../shared/domain/clock.port';
import { UnauthorizedError } from '../../../shared/domain/errors';
import { TokenClaims, TokenService, VerifiedToken } from '../domain/token-service.port';

export const TOKEN_TTL_SECONDS = 7 * 24 * 3600;
const INVALID = 'Sessão expirada ou inválida';
const HEADER = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');

/** JWT HS256 mínimo (sem dependências). */
export class HmacJwtTokenService implements TokenService {
  constructor(
    private readonly secret: string,
    private readonly clock: Clock,
  ) {}

  sign(claims: TokenClaims): string {
    const iat = Math.floor(this.clock.now().getTime() / 1000);
    const payload = Buffer.from(
      JSON.stringify({ sub: claims.sub, role: claims.role, iat, exp: iat + TOKEN_TTL_SECONDS }),
    ).toString('base64url');
    const data = `${HEADER}.${payload}`;
    return `${data}.${this.signature(data)}`;
  }

  verify(token: string): VerifiedToken {
    if (typeof token !== 'string') throw new UnauthorizedError(INVALID);
    const parts = token.split('.');
    if (parts.length !== 3) throw new UnauthorizedError(INVALID);
    const [header, payload, signature] = parts;
    try {
      const h = JSON.parse(Buffer.from(header, 'base64url').toString('utf8')) as {
        alg?: unknown;
        typ?: unknown;
      };
      if (h.alg !== 'HS256' || h.typ !== 'JWT') throw new UnauthorizedError(INVALID);
      const expected = Buffer.from(this.signature(`${header}.${payload}`));
      const actual = Buffer.from(signature);
      if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
        throw new UnauthorizedError(INVALID);
      }
      const p = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
        sub?: unknown;
        role?: unknown;
        exp?: unknown;
      };
      if (typeof p.sub !== 'string' || (p.role !== 'USER' && p.role !== 'ADMIN')) {
        throw new UnauthorizedError(INVALID);
      }
      if (typeof p.exp !== 'number' || p.exp <= Math.floor(this.clock.now().getTime() / 1000)) {
        throw new UnauthorizedError(INVALID);
      }
      return { sub: p.sub, role: p.role, exp: p.exp };
    } catch (e) {
      if (e instanceof UnauthorizedError) throw e;
      throw new UnauthorizedError(INVALID);
    }
  }

  private signature(data: string): string {
    return createHmac('sha256', this.secret).update(data).digest('base64url');
  }
}
