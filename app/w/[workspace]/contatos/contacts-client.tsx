"use client";

import { useMemo, useState } from "react";
import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/table";
import { DropdownItem, DropdownMenu } from "@/components/ui/dropdown-menu";
import { formatPhoneForDisplay } from "@/lib/phone";
import type { Segment, Tag } from "@/lib/db/schema";
import type { ContactWithRelations } from "@/lib/contacts/queries";
import { ContactFormDialog } from "./contact-form-dialog";
import { ImportDialog } from "./import-dialog";
import { deleteContact } from "./actions";

export function ContactsClient({
  workspace,
  contacts,
  tags,
  segments,
}: {
  workspace: string;
  contacts: ContactWithRelations[];
  tags: Tag[];
  segments: Segment[];
}) {
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<ContactWithRelations | null>(null);

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !c.phone.includes(q)) return false;
      }
      if (tagFilter && !c.tags.some((t) => t.id === tagFilter)) return false;
      if (segmentFilter && !c.segments.some((s) => s.id === segmentFilter)) return false;
      return true;
    });
  }, [contacts, search, tagFilter, segmentFilter]);

  async function handleDelete(id: string) {
    if (!confirm("Remover este contato?")) return;
    const result = await deleteContact(workspace, id);
    if (!result.ok) alert(result.error);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Contatos</h1>
          <p className="text-sm text-slate-500">{contacts.length} contato(s) neste workspace</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Importar
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Novo contato
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou telefone…"
          className="max-w-xs"
        />
        <Select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="max-w-40">
          <option value="">Todas as tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
        <Select value={segmentFilter} onChange={(e) => setSegmentFilter(e.target.value)} className="max-w-48">
          <option value="">Todos os segmentos</option>
          {segments.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>

      <Table>
        <Thead>
          <Tr>
            <Th>Nome</Th>
            <Th>Telefone</Th>
            <Th>Tags</Th>
            <Th>Segmentos</Th>
            <Th />
          </Tr>
        </Thead>
        <Tbody>
          {filtered.length === 0 ? (
            <Tr>
              <Td colSpan={5} className="py-8 text-center text-slate-400">
                Nenhum contato encontrado.
              </Td>
            </Tr>
          ) : (
            filtered.map((c) => (
              <Tr key={c.id}>
                <Td className="font-medium text-slate-900">{c.name}</Td>
                <Td>{formatPhoneForDisplay(c.phone)}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {c.tags.map((t) => (
                      <Badge key={t.id} style={{ backgroundColor: `${t.color}20`, color: t.color }}>
                        {t.name}
                      </Badge>
                    ))}
                  </div>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {c.segments.map((s) => (
                      <Badge key={s.id} tone="blue">
                        {s.name}
                      </Badge>
                    ))}
                  </div>
                </Td>
                <Td>
                  <DropdownMenu>
                    <DropdownItem onClick={() => setEditing(c)}>Editar</DropdownItem>
                    <DropdownItem onClick={() => handleDelete(c.id)} className="text-red-600">
                      Remover
                    </DropdownItem>
                  </DropdownMenu>
                </Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>

      <ContactFormDialog
        workspace={workspace}
        tags={tags}
        segments={segments}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      {editing ? (
        <ContactFormDialog
          workspace={workspace}
          tags={tags}
          segments={segments}
          contact={editing}
          open={Boolean(editing)}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      ) : null}
      <ImportDialog workspace={workspace} tags={tags} segments={segments} open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
