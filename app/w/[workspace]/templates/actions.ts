"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { whatsappConnections, whatsappTemplates } from "@/lib/db/schema";
import { decryptJson } from "@/lib/crypto";
import { getProvider } from "@/lib/whatsapp/registry";
import type { TemplateComponent } from "@/lib/whatsapp/types";
import { requireWorkspaceMember } from "@/lib/workspace/auth";

export interface ActionState {
  ok: boolean;
  error?: string;
}

async function getConnectionOrThrow(organizationId: string, connectionId: string) {
  const [connection] = await db
    .select()
    .from(whatsappConnections)
    .where(and(eq(whatsappConnections.id, connectionId), eq(whatsappConnections.organizationId, organizationId)));
  if (!connection) throw new Error("Conexão não encontrada.");
  return connection;
}

export async function syncTemplates(workspace: string, connectionId: string): Promise<ActionState> {
  const ctx = await requireWorkspaceMember(workspace);
  try {
    const connection = await getConnectionOrThrow(ctx.organizationId, connectionId);
    const provider = getProvider(connection.provider);
    const config = decryptJson(connection.config);
    const remoteTemplates = await provider.listTemplates(config);

    for (const t of remoteTemplates) {
      await db
        .insert(whatsappTemplates)
        .values({
          organizationId: ctx.organizationId,
          connectionId,
          providerTemplateId: t.providerId,
          name: t.name,
          language: t.language,
          category: t.category,
          status: t.status,
          components: t.components,
          synced_at: new Date(),
        })
        .onConflictDoUpdate({
          target: [whatsappTemplates.connectionId, whatsappTemplates.name, whatsappTemplates.language],
          set: {
            providerTemplateId: t.providerId,
            status: t.status,
            category: t.category,
            components: t.components,
            synced_at: new Date(),
            updatedAt: new Date(),
          },
        });
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Falha ao sincronizar templates." };
  }

  revalidatePath(`/w/${workspace}/templates`);
  return { ok: true };
}

export async function deleteTemplateAction(workspace: string, templateId: string): Promise<ActionState> {
  const ctx = await requireWorkspaceMember(workspace);
  try {
    const [template] = await db
      .select()
      .from(whatsappTemplates)
      .where(and(eq(whatsappTemplates.id, templateId), eq(whatsappTemplates.organizationId, ctx.organizationId)));
    if (!template) return { ok: false, error: "Template não encontrado." };

    const connection = await getConnectionOrThrow(ctx.organizationId, template.connectionId);
    const provider = getProvider(connection.provider);
    const config = decryptJson(connection.config);
    await provider.deleteTemplate(config, { name: template.name }).catch(() => undefined);

    await db.delete(whatsappTemplates).where(eq(whatsappTemplates.id, templateId));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("violates foreign key constraint")) {
      return { ok: false, error: "Não é possível remover: este template está em uso por uma campanha." };
    }
    return { ok: false, error: message };
  }

  revalidatePath(`/w/${workspace}/templates`);
  return { ok: true };
}

const componentSchema = z.array(z.custom<TemplateComponent>()).min(1, "Adicione ao menos o corpo da mensagem.");

const createSchema = z.object({
  connectionId: z.string().min(1, "Selecione a conexão"),
  name: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]+$/, "Use apenas letras minúsculas, números e underscore"),
  category: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]),
  language: z.string().min(2),
  componentsJson: z.string(),
});

export async function createTemplateDraft(
  workspace: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireWorkspaceMember(workspace);
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  let components: TemplateComponent[];
  try {
    components = componentSchema.parse(JSON.parse(parsed.data.componentsJson));
  } catch {
    return { ok: false, error: "Não foi possível montar os componentes do template." };
  }

  try {
    const connection = await getConnectionOrThrow(ctx.organizationId, parsed.data.connectionId);
    const provider = getProvider(connection.provider);
    const config = decryptJson(connection.config);

    const result = await provider.createTemplate(config, {
      name: parsed.data.name,
      language: parsed.data.language,
      category: parsed.data.category,
      components,
    });

    await db.insert(whatsappTemplates).values({
      organizationId: ctx.organizationId,
      connectionId: parsed.data.connectionId,
      providerTemplateId: result.providerId,
      name: parsed.data.name,
      language: parsed.data.language,
      category: parsed.data.category,
      status: result.status,
      components,
      synced_at: new Date(),
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Falha ao criar o template." };
  }

  revalidatePath(`/w/${workspace}/templates`);
  redirect(`/w/${workspace}/templates`);
}
