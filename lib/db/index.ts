import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let instance: Db | undefined;

/**
 * Inicialização preguiçosa: evita ler DATABASE_URL/abrir o driver no momento em que o módulo é
 * importado. O Next.js executa o escopo de módulo de rotas durante o build ("collect page data")
 * mesmo para rotas dinâmicas — validar/conectar ali quebraria o build sempre que as variáveis de
 * ambiente do banco não estiverem disponíveis nesse passo (ex.: antes do primeiro deploy real).
 */
function getDb(): Db {
  if (!instance) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL não configurada.");
    }
    const sql = neon(process.env.DATABASE_URL);
    instance = drizzle(sql, { schema });
  }
  return instance;
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
