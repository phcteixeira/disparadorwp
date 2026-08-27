import { createNeonAuth } from "@neondatabase/auth/next/server";

type Auth = ReturnType<typeof createNeonAuth>;

let instance: Auth | undefined;

/**
 * Inicialização preguiçosa (mesmo motivo de lib/db/index.ts): adia a leitura/validação das
 * variáveis de ambiente do Neon Auth para o primeiro uso real, em vez do momento de import do
 * módulo — que o Next.js executa durante o build.
 */
function getAuth(): Auth {
  if (!instance) {
    if (!process.env.NEON_AUTH_BASE_URL) {
      throw new Error("NEON_AUTH_BASE_URL não configurada.");
    }
    if (!process.env.NEON_AUTH_COOKIE_SECRET) {
      throw new Error("NEON_AUTH_COOKIE_SECRET não configurada.");
    }
    instance = createNeonAuth({
      baseUrl: process.env.NEON_AUTH_BASE_URL,
      cookies: {
        secret: process.env.NEON_AUTH_COOKIE_SECRET,
      },
    });
  }
  return instance;
}

export const auth: Auth = new Proxy({} as Auth, {
  get(_target, prop, receiver) {
    return Reflect.get(getAuth(), prop, receiver);
  },
});
