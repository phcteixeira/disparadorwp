"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { requireWorkspaceMember } from "@/lib/workspace/auth";
import { TIMEZONES } from "./timezones";

export interface ActionState {
  ok: boolean;
  error?: string;
}

const updateSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome"),
  timezone: z.enum(TIMEZONES),
});

export async function updateWorkspace(
  workspace: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireWorkspaceMember(workspace, "admin");
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const { error } = await auth.organization.update({
    organizationId: ctx.organizationId,
    data: { name: parsed.data.name, metadata: { timezone: parsed.data.timezone } },
  });

  if (error) return { ok: false, error: error.message ?? "Não foi possível salvar." };

  revalidatePath(`/w/${workspace}`);
  return { ok: true };
}

export async function deleteWorkspace(workspace: string): Promise<ActionState> {
  const ctx = await requireWorkspaceMember(workspace, "owner");
  const { error } = await auth.organization.delete({ organizationId: ctx.organizationId });
  if (error) return { ok: false, error: error.message ?? "Não foi possível excluir o workspace." };
  redirect("/novo-workspace");
}
