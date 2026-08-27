"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { contactSegments, contactTags, contacts } from "@/lib/db/schema";
import { findOrCreateTags } from "@/lib/contacts/queries";
import { normalizePhone } from "@/lib/phone";
import { parseCsv } from "@/lib/csv";
import { requireWorkspaceMember } from "@/lib/workspace/auth";

export interface ActionState {
  ok: boolean;
  error?: string;
}

const contactSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome"),
  phone: z.string().trim().min(8, "Informe um telefone válido"),
  email: z.string().trim().email("E-mail inválido").optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

function collectMulti(formData: FormData, key: string): string[] {
  return formData.getAll(key).map(String).filter(Boolean);
}

async function syncContactRelations(
  organizationId: string,
  contactId: string,
  tagIds: string[],
  segmentIds: string[],
  newTagNames: string[],
) {
  const createdTags = await findOrCreateTags(organizationId, newTagNames);
  const allTagIds = [...new Set([...tagIds, ...createdTags.map((t) => t.id)])];

  await db.delete(contactTags).where(eq(contactTags.contactId, contactId));
  await db.delete(contactSegments).where(eq(contactSegments.contactId, contactId));

  if (allTagIds.length > 0) {
    await db.insert(contactTags).values(allTagIds.map((tagId) => ({ contactId, tagId })));
  }
  if (segmentIds.length > 0) {
    await db.insert(contactSegments).values(segmentIds.map((segmentId) => ({ contactId, segmentId })));
  }
}

export async function createContact(
  workspace: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireWorkspaceMember(workspace);
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return { ok: false, error: "Telefone inválido." };

  try {
    const [contact] = await db
      .insert(contacts)
      .values({
        organizationId: ctx.organizationId,
        name: parsed.data.name,
        phone,
        email: parsed.data.email || null,
        notes: parsed.data.notes || null,
      })
      .returning();

    if (!contact) return { ok: false, error: "Não foi possível criar o contato." };

    const newTagNames = String(formData.get("newTags") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    await syncContactRelations(
      ctx.organizationId,
      contact.id,
      collectMulti(formData, "tagIds"),
      collectMulti(formData, "segmentIds"),
      newTagNames,
    );
  } catch (err) {
    return { ok: false, error: describeDbError(err, "criar contato") };
  }

  revalidatePath(`/w/${workspace}/contatos`);
  return { ok: true };
}

export async function updateContact(
  workspace: string,
  contactId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireWorkspaceMember(workspace);
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return { ok: false, error: "Telefone inválido." };

  try {
    const result = await db
      .update(contacts)
      .set({
        name: parsed.data.name,
        phone,
        email: parsed.data.email || null,
        notes: parsed.data.notes || null,
        updatedAt: new Date(),
      })
      .where(and(eq(contacts.id, contactId), eq(contacts.organizationId, ctx.organizationId)))
      .returning();

    if (result.length === 0) return { ok: false, error: "Contato não encontrado." };

    const newTagNames = String(formData.get("newTags") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    await syncContactRelations(
      ctx.organizationId,
      contactId,
      collectMulti(formData, "tagIds"),
      collectMulti(formData, "segmentIds"),
      newTagNames,
    );
  } catch (err) {
    return { ok: false, error: describeDbError(err, "atualizar contato") };
  }

  revalidatePath(`/w/${workspace}/contatos`);
  return { ok: true };
}

export async function deleteContact(workspace: string, contactId: string): Promise<ActionState> {
  const ctx = await requireWorkspaceMember(workspace);
  try {
    await db
      .delete(contacts)
      .where(and(eq(contacts.id, contactId), eq(contacts.organizationId, ctx.organizationId)));
  } catch (err) {
    return { ok: false, error: describeDbError(err, "remover contato") };
  }
  revalidatePath(`/w/${workspace}/contatos`);
  return { ok: true };
}

export interface ImportSummary {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export interface ImportState {
  ok: boolean;
  error?: string;
  summary?: ImportSummary;
}

const importColumnsSchema = z.object({
  csv: z.string().min(1),
  nameColumn: z.string().min(1),
  phoneColumn: z.string().min(1),
  emailColumn: z.string().optional().default(""),
});

export async function importContacts(
  workspace: string,
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const ctx = await requireWorkspaceMember(workspace);
  const parsed = importColumnsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Selecione o arquivo e as colunas de nome e telefone." };
  }

  const { csv, nameColumn, phoneColumn, emailColumn } = parsed.data;
  const { rows, errors: parseErrors } = parseCsv(csv);

  const tagIds = collectMulti(formData, "tagIds");
  const segmentIds = collectMulti(formData, "segmentIds");
  const newTagNames = String(formData.get("newTags") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const createdTags = await findOrCreateTags(ctx.organizationId, newTagNames);
  const allTagIds = [...new Set([...tagIds, ...createdTags.map((t) => t.id)])];

  const summary: ImportSummary = { created: 0, updated: 0, skipped: 0, errors: [...parseErrors] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const name = row[nameColumn]?.trim();
    const rawPhone = row[phoneColumn]?.trim();
    const email = emailColumn ? row[emailColumn]?.trim() : undefined;

    if (!name || !rawPhone) {
      summary.skipped++;
      summary.errors.push(`Linha ${i + 2}: nome ou telefone vazio.`);
      continue;
    }
    const phone = normalizePhone(rawPhone);
    if (!phone) {
      summary.skipped++;
      summary.errors.push(`Linha ${i + 2}: telefone inválido ("${rawPhone}").`);
      continue;
    }

    try {
      const [existing] = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(and(eq(contacts.organizationId, ctx.organizationId), eq(contacts.phone, phone)));

      let contactId: string;
      if (existing) {
        await db
          .update(contacts)
          .set({ name, email: email || null, updatedAt: new Date() })
          .where(eq(contacts.id, existing.id));
        contactId = existing.id;
        summary.updated++;
      } else {
        const [created] = await db
          .insert(contacts)
          .values({ organizationId: ctx.organizationId, name, phone, email: email || null })
          .returning({ id: contacts.id });
        if (!created) throw new Error("insert falhou");
        contactId = created.id;
        summary.created++;
      }

      if (allTagIds.length > 0) {
        await db
          .insert(contactTags)
          .values(allTagIds.map((tagId) => ({ contactId, tagId })))
          .onConflictDoNothing();
      }
      if (segmentIds.length > 0) {
        await db
          .insert(contactSegments)
          .values(segmentIds.map((segmentId) => ({ contactId, segmentId })))
          .onConflictDoNothing();
      }
    } catch (err) {
      summary.skipped++;
      summary.errors.push(`Linha ${i + 2}: ${describeDbError(err, "importar")}`);
    }
  }

  revalidatePath(`/w/${workspace}/contatos`);
  return { ok: true, summary };
}

function describeDbError(err: unknown, action: string): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("contacts_org_phone_unique")) {
    return "Já existe um contato com esse telefone neste workspace.";
  }
  if (message.includes("violates foreign key constraint")) {
    return "Não é possível remover: este contato faz parte do histórico de uma campanha.";
  }
  return `Não foi possível ${action}: ${message}`;
}
