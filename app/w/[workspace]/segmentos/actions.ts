"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { segments } from "@/lib/db/schema";
import { requireWorkspaceMember } from "@/lib/workspace/auth";

export interface ActionState {
  ok: boolean;
  error?: string;
}

const segmentSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do segmento"),
  description: z.string().trim().optional().or(z.literal("")),
});

export async function createSegment(
  workspace: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireWorkspaceMember(workspace);
  const parsed = segmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  try {
    await db.insert(segments).values({
      organizationId: ctx.organizationId,
      name: parsed.data.name,
      description: parsed.data.description || null,
    });
  } catch (err) {
    return { ok: false, error: describeDbError(err) };
  }

  revalidatePath(`/w/${workspace}/segmentos`);
  return { ok: true };
}

export async function updateSegment(
  workspace: string,
  segmentId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireWorkspaceMember(workspace);
  const parsed = segmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  try {
    await db
      .update(segments)
      .set({ name: parsed.data.name, description: parsed.data.description || null, updatedAt: new Date() })
      .where(and(eq(segments.id, segmentId), eq(segments.organizationId, ctx.organizationId)));
  } catch (err) {
    return { ok: false, error: describeDbError(err) };
  }

  revalidatePath(`/w/${workspace}/segmentos`);
  return { ok: true };
}

export async function deleteSegment(workspace: string, segmentId: string): Promise<ActionState> {
  const ctx = await requireWorkspaceMember(workspace);
  try {
    await db
      .delete(segments)
      .where(and(eq(segments.id, segmentId), eq(segments.organizationId, ctx.organizationId)));
  } catch (err) {
    return { ok: false, error: describeDbError(err) };
  }
  revalidatePath(`/w/${workspace}/segmentos`);
  return { ok: true };
}

function describeDbError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("violates foreign key constraint")) {
    return "Não é possível remover: este segmento está em uso por uma ou mais campanhas.";
  }
  return `Não foi possível salvar: ${message}`;
}
