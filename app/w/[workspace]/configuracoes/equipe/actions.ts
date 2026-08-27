"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { requireWorkspaceMember } from "@/lib/workspace/auth";

export interface ActionState {
  ok: boolean;
  error?: string;
}

const inviteSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  role: z.enum(["member", "admin"]),
});

export async function inviteMember(
  workspace: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireWorkspaceMember(workspace, "admin");
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const { error } = await auth.organization.inviteMember({
    email: parsed.data.email,
    role: parsed.data.role,
    organizationId: ctx.organizationId,
  });

  if (error) return { ok: false, error: error.message ?? "Não foi possível enviar o convite." };

  revalidatePath(`/w/${workspace}/configuracoes/equipe`);
  return { ok: true };
}

export async function updateMemberRole(
  workspace: string,
  memberId: string,
  role: "member" | "admin" | "owner",
): Promise<ActionState> {
  const ctx = await requireWorkspaceMember(workspace, "admin");
  const { error } = await auth.organization.updateMemberRole({
    memberId,
    role,
    organizationId: ctx.organizationId,
  });
  if (error) return { ok: false, error: error.message ?? "Não foi possível atualizar o papel." };

  revalidatePath(`/w/${workspace}/configuracoes/equipe`);
  return { ok: true };
}

export async function removeMember(workspace: string, memberIdOrEmail: string): Promise<ActionState> {
  const ctx = await requireWorkspaceMember(workspace, "admin");
  const { error } = await auth.organization.removeMember({
    memberIdOrEmail,
    organizationId: ctx.organizationId,
  });
  if (error) return { ok: false, error: error.message ?? "Não foi possível remover o membro." };

  revalidatePath(`/w/${workspace}/configuracoes/equipe`);
  return { ok: true };
}

export async function cancelInvitation(workspace: string, invitationId: string): Promise<ActionState> {
  await requireWorkspaceMember(workspace, "admin");
  const { error } = await auth.organization.cancelInvitation({ invitationId });
  if (error) return { ok: false, error: error.message ?? "Não foi possível cancelar o convite." };

  revalidatePath(`/w/${workspace}/configuracoes/equipe`);
  return { ok: true };
}
