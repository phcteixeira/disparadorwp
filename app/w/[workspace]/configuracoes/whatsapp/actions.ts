"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { whatsappConnections } from "@/lib/db/schema";
import { decryptJson, encryptJson } from "@/lib/crypto";
import { getProvider } from "@/lib/whatsapp/registry";
import { requireWorkspaceMember } from "@/lib/workspace/auth";

export interface ActionState {
  ok: boolean;
  error?: string;
}

const createSchema = z.object({
  provider: z.string().min(1),
  name: z.string().trim().min(1, "Dê um nome para esta conexão"),
  accountToken: z.string().trim().min(1, "Informe o token da conta"),
  channelToken: z.string().trim().min(1, "Informe o token do canal"),
});

export async function createConnection(
  workspace: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireWorkspaceMember(workspace, "admin");
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const provider = getProvider(parsed.data.provider);
  const configResult = provider.configSchema.safeParse({
    accountToken: parsed.data.accountToken,
    channelToken: parsed.data.channelToken,
  });
  if (!configResult.success) {
    return { ok: false, error: configResult.error.issues[0]?.message ?? "Credenciais inválidas." };
  }

  const [connection] = await db
    .insert(whatsappConnections)
    .values({
      organizationId: ctx.organizationId,
      provider: provider.key,
      name: parsed.data.name,
      config: encryptJson(configResult.data),
    })
    .returning();

  if (!connection) return { ok: false, error: "Não foi possível salvar a conexão." };

  await testConnection(workspace, connection.id);
  revalidatePath(`/w/${workspace}/configuracoes/whatsapp`);
  return { ok: true };
}

export async function testConnection(workspace: string, connectionId: string): Promise<ActionState> {
  const ctx = await requireWorkspaceMember(workspace);
  const [connection] = await db
    .select()
    .from(whatsappConnections)
    .where(and(eq(whatsappConnections.id, connectionId), eq(whatsappConnections.organizationId, ctx.organizationId)));

  if (!connection) return { ok: false, error: "Conexão não encontrada." };

  const provider = getProvider(connection.provider);
  const config = decryptJson(connection.config);
  const result = await provider.testConnection(config);

  await db
    .update(whatsappConnections)
    .set({
      status: result.ok ? "connected" : "error",
      health: result.health ?? connection.health,
      lastCheckedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(whatsappConnections.id, connectionId));

  revalidatePath(`/w/${workspace}/configuracoes/whatsapp`);
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function registerWebhook(workspace: string, connectionId: string): Promise<ActionState> {
  const ctx = await requireWorkspaceMember(workspace, "admin");
  const [connection] = await db
    .select()
    .from(whatsappConnections)
    .where(and(eq(whatsappConnections.id, connectionId), eq(whatsappConnections.organizationId, ctx.organizationId)));

  if (!connection) return { ok: false, error: "Conexão não encontrada." };

  const appBaseUrl = process.env.APP_BASE_URL;
  if (!appBaseUrl) return { ok: false, error: "APP_BASE_URL não configurada no servidor." };

  try {
    const provider = getProvider(connection.provider);
    const config = decryptJson(connection.config);
    await provider.registerWebhook(config, {
      url: `${appBaseUrl}/api/webhooks/${connection.provider}/${connection.id}`,
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Falha ao registrar o webhook." };
  }

  return { ok: true };
}

export async function deleteConnection(workspace: string, connectionId: string): Promise<ActionState> {
  const ctx = await requireWorkspaceMember(workspace, "admin");
  try {
    await db
      .delete(whatsappConnections)
      .where(and(eq(whatsappConnections.id, connectionId), eq(whatsappConnections.organizationId, ctx.organizationId)));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("violates foreign key constraint")) {
      return { ok: false, error: "Não é possível remover: existem templates ou campanhas usando esta conexão." };
    }
    return { ok: false, error: message };
  }
  revalidatePath(`/w/${workspace}/configuracoes/whatsapp`);
  return { ok: true };
}
