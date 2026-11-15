export type AuthConfig = { jwtSecret: string };

const DEV_SECRET = 'dev-only-insecure-jwt-secret-change-me';
const MIN_SECRET_LENGTH = 32;
/** Ambientes locais em que o segredo padrão (público) é aceito. Qualquer outro (production, staging...) exige JWT_SECRET. */
const LOCAL_ENVS = new Set([undefined, '', 'development', 'test']);

/** Lê a configuração de autenticação do ambiente (A5). Fora de dev/test o segredo é obrigatório. */
export function loadAuthConfig(env: Record<string, string | undefined>): AuthConfig {
  const secret = env.JWT_SECRET;
  if (!LOCAL_ENVS.has(env.NODE_ENV)) {
    if (!secret || secret.length < MIN_SECRET_LENGTH) {
      throw new Error(`JWT_SECRET ausente ou curto (mín. 32) em ${env.NODE_ENV === 'production' ? 'produção' : env.NODE_ENV}`);
    }
    return { jwtSecret: secret };
  }
  return { jwtSecret: secret && secret.length > 0 ? secret : DEV_SECRET };
}
