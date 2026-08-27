import type { WhatsAppProvider } from "./types";
import { notificameProvider } from "./providers/notificame/provider";

/**
 * Ponto único de registro dos plugins de WhatsApp. Para adicionar um novo provedor:
 * 1. crie `lib/whatsapp/providers/<chave>/provider.ts` implementando `WhatsAppProvider`;
 * 2. registre a instância aqui.
 * Nenhum outro lugar do app deve importar um provider diretamente — sempre via `getProvider`.
 */
const providers: Record<string, WhatsAppProvider> = {
  notificame: notificameProvider,
};

export function getProvider(key: string): WhatsAppProvider {
  const provider = providers[key];
  if (!provider) {
    throw new Error(`Provedor de WhatsApp desconhecido: ${key}`);
  }
  return provider;
}

export function listProviders(): WhatsAppProvider[] {
  return Object.values(providers);
}
