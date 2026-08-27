import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { contactSegments, contactTags, contacts, segments, tags } from "@/lib/db/schema";
import type { Contact, Segment, Tag } from "@/lib/db/schema";

export interface ContactWithRelations extends Contact {
  tags: Tag[];
  segments: Segment[];
}

/** Todos os contatos do workspace, já com tags e segmentos associados. Teto de 2000 para o MVP. */
export async function getContactsWithRelations(organizationId: string): Promise<ContactWithRelations[]> {
  const rows = await db
    .select()
    .from(contacts)
    .where(eq(contacts.organizationId, organizationId))
    .orderBy(desc(contacts.createdAt))
    .limit(2000);

  const ids = rows.map((c) => c.id);
  if (ids.length === 0) return [];

  const [tagLinks, segmentLinks] = await Promise.all([
    db
      .select({ contactId: contactTags.contactId, tag: tags })
      .from(contactTags)
      .innerJoin(tags, eq(contactTags.tagId, tags.id))
      .where(inArray(contactTags.contactId, ids)),
    db
      .select({ contactId: contactSegments.contactId, segment: segments })
      .from(contactSegments)
      .innerJoin(segments, eq(contactSegments.segmentId, segments.id))
      .where(inArray(contactSegments.contactId, ids)),
  ]);

  const tagsByContact = new Map<string, Tag[]>();
  for (const link of tagLinks) {
    const list = tagsByContact.get(link.contactId) ?? [];
    list.push(link.tag);
    tagsByContact.set(link.contactId, list);
  }

  const segmentsByContact = new Map<string, Segment[]>();
  for (const link of segmentLinks) {
    const list = segmentsByContact.get(link.contactId) ?? [];
    list.push(link.segment);
    segmentsByContact.set(link.contactId, list);
  }

  return rows.map((c) => ({
    ...c,
    tags: tagsByContact.get(c.id) ?? [],
    segments: segmentsByContact.get(c.id) ?? [],
  }));
}

export async function getWorkspaceTags(organizationId: string): Promise<Tag[]> {
  return db.select().from(tags).where(eq(tags.organizationId, organizationId)).orderBy(tags.name);
}

export async function getWorkspaceSegments(organizationId: string): Promise<Segment[]> {
  return db.select().from(segments).where(eq(segments.organizationId, organizationId)).orderBy(segments.name);
}

/** Busca (ou cria) tags do workspace a partir de uma lista de nomes livres (import/criação inline). */
export async function findOrCreateTags(organizationId: string, names: string[]): Promise<Tag[]> {
  const clean = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (clean.length === 0) return [];

  const existing = await db.select().from(tags).where(eq(tags.organizationId, organizationId));
  const existingByName = new Map(existing.map((t) => [t.name.toLowerCase(), t]));

  const toCreate = clean.filter((n) => !existingByName.has(n.toLowerCase()));
  const created = toCreate.length
    ? await db
        .insert(tags)
        .values(toCreate.map((name) => ({ organizationId, name })))
        .onConflictDoNothing()
        .returning()
    : [];

  // onConflictDoNothing pode não retornar linhas que já existiam por corrida — busca de novo se faltou algo.
  const result = clean.map(
    (n) => existingByName.get(n.toLowerCase()) ?? created.find((t) => t.name.toLowerCase() === n.toLowerCase()),
  );
  const missing = clean.filter((_, i) => !result[i]);
  if (missing.length > 0) {
    const refetched = await db.select().from(tags).where(eq(tags.organizationId, organizationId));
    const refetchedByName = new Map(refetched.map((t) => [t.name.toLowerCase(), t]));
    return clean.map((n) => refetchedByName.get(n.toLowerCase())).filter((t): t is Tag => Boolean(t));
  }

  return result.filter((t): t is Tag => Boolean(t));
}
