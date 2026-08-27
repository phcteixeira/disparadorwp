"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { campaignRecipients, campaigns } from "@/lib/db/schema";
import type { VariableMapping } from "@/lib/whatsapp/types";
import { zonedTimeToUtc } from "@/lib/timezone";
import { requireWorkspaceMember } from "@/lib/workspace/auth";

export interface ActionState {
  ok: boolean;
  error?: string;
}

const campaignSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da campanha"),
  connectionId: z.string().min(1, "Selecione a conexão"),
  templateId: z.string().min(1, "Selecione o template"),
  segmentId: z.string().min(1, "Selecione o público-alvo"),
  scheduleMode: z.enum(["draft", "now", "later"]),
  scheduledAtLocal: z.string().optional(),
  variableMappingJson: z.string(),
});

function resolveSchedule(
  data: z.infer<typeof campaignSchema>,
  timezone: string,
): { ok: true; status: "draft" | "scheduled"; scheduledAt: Date | null } | { ok: false; error: string } {
  if (data.scheduleMode === "draft") return { ok: true, status: "draft", scheduledAt: null };
  if (data.scheduleMode === "now") return { ok: true, status: "scheduled", scheduledAt: new Date() };

  if (!data.scheduledAtLocal) return { ok: false, error: "Informe a data e hora do agendamento." };
  let scheduledAt: Date;
  try {
    scheduledAt = zonedTimeToUtc(data.scheduledAtLocal, timezone);
  } catch {
    return { ok: false, error: "Data e hora inválidas." };
  }
  if (scheduledAt.getTime() < Date.now() - 60_000) {
    return { ok: false, error: "A data agendada precisa estar no futuro." };
  }
  return { ok: true, status: "scheduled", scheduledAt };
}

export async function createCampaign(
  workspace: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireWorkspaceMember(workspace);
  const parsed = campaignSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const schedule = resolveSchedule(parsed.data, ctx.timezone);
  if (!schedule.ok) return { ok: false, error: schedule.error };

  let variableMapping: VariableMapping = {};
  try {
    variableMapping = JSON.parse(parsed.data.variableMappingJson);
  } catch {
    return { ok: false, error: "Mapeamento de variáveis inválido." };
  }

  await db.insert(campaigns).values({
    organizationId: ctx.organizationId,
    connectionId: parsed.data.connectionId,
    templateId: parsed.data.templateId,
    segmentId: parsed.data.segmentId,
    name: parsed.data.name,
    status: schedule.status,
    scheduledAt: schedule.scheduledAt,
    variableMapping,
    createdBy: ctx.userId,
  });

  revalidatePath(`/w/${workspace}/campanhas`);
  redirect(`/w/${workspace}/campanhas`);
}

export async function updateCampaign(
  workspace: string,
  campaignId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireWorkspaceMember(workspace);
  const parsed = campaignSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const [existing] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.organizationId, ctx.organizationId)));
  if (!existing) return { ok: false, error: "Campanha não encontrada." };
  if (existing.status !== "draft" && existing.status !== "scheduled") {
    return { ok: false, error: "Esta campanha já começou a ser enviada e não pode mais ser editada." };
  }

  const schedule = resolveSchedule(parsed.data, ctx.timezone);
  if (!schedule.ok) return { ok: false, error: schedule.error };

  let variableMapping: VariableMapping = {};
  try {
    variableMapping = JSON.parse(parsed.data.variableMappingJson);
  } catch {
    return { ok: false, error: "Mapeamento de variáveis inválido." };
  }

  await db
    .update(campaigns)
    .set({
      name: parsed.data.name,
      connectionId: parsed.data.connectionId,
      templateId: parsed.data.templateId,
      segmentId: parsed.data.segmentId,
      status: schedule.status,
      scheduledAt: schedule.scheduledAt,
      variableMapping,
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, campaignId));

  revalidatePath(`/w/${workspace}/campanhas`);
  redirect(`/w/${workspace}/campanhas`);
}

export async function cancelCampaign(workspace: string, campaignId: string): Promise<ActionState> {
  const ctx = await requireWorkspaceMember(workspace);
  const [existing] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.organizationId, ctx.organizationId)));
  if (!existing) return { ok: false, error: "Campanha não encontrada." };

  if (existing.status === "draft") {
    await db.delete(campaigns).where(eq(campaigns.id, campaignId));
  } else if (existing.status === "scheduled") {
    await db.update(campaigns).set({ status: "canceled", updatedAt: new Date() }).where(eq(campaigns.id, campaignId));
  } else {
    return { ok: false, error: "Só é possível cancelar campanhas em rascunho ou agendadas." };
  }

  revalidatePath(`/w/${workspace}/campanhas`);
  return { ok: true };
}

export async function sendCampaignNow(workspace: string, campaignId: string): Promise<ActionState> {
  const ctx = await requireWorkspaceMember(workspace);
  const [existing] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.organizationId, ctx.organizationId)));
  if (!existing) return { ok: false, error: "Campanha não encontrada." };
  if (existing.status !== "draft") return { ok: false, error: "Só é possível enviar campanhas em rascunho." };

  await db
    .update(campaigns)
    .set({ status: "scheduled", scheduledAt: new Date(), updatedAt: new Date() })
    .where(eq(campaigns.id, campaignId));

  revalidatePath(`/w/${workspace}/campanhas`);
  return { ok: true };
}

export async function retryFailedRecipients(workspace: string, campaignId: string): Promise<ActionState> {
  const ctx = await requireWorkspaceMember(workspace);
  const [existing] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), eq(campaigns.organizationId, ctx.organizationId)));
  if (!existing) return { ok: false, error: "Campanha não encontrada." };

  await db
    .update(campaignRecipients)
    .set({ status: "pending", error: null })
    .where(and(eq(campaignRecipients.campaignId, campaignId), eq(campaignRecipients.status, "failed")));

  if (existing.status === "completed" || existing.status === "failed") {
    await db.update(campaigns).set({ status: "sending", finishedAt: null }).where(eq(campaigns.id, campaignId));
  }

  revalidatePath(`/w/${workspace}/campanhas/${campaignId}`);
  return { ok: true };
}
