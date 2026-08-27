"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/table";
import { DropdownItem, DropdownMenu } from "@/components/ui/dropdown-menu";
import type { Segment } from "@/lib/db/schema";
import { SegmentFormDialog } from "./segment-form-dialog";
import { deleteSegment } from "./actions";

export interface SegmentWithCount extends Segment {
  contactCount: number;
}

export function SegmentsClient({ workspace, segments }: { workspace: string; segments: SegmentWithCount[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Segment | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Remover este segmento?")) return;
    const result = await deleteSegment(workspace, id);
    if (!result.ok) alert(result.error);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Segmentos</h1>
          <p className="text-sm text-slate-500">Agrupe contatos para direcionar suas campanhas.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Novo segmento
        </Button>
      </div>

      <Table>
        <Thead>
          <Tr>
            <Th>Nome</Th>
            <Th>Descrição</Th>
            <Th>Contatos</Th>
            <Th />
          </Tr>
        </Thead>
        <Tbody>
          {segments.length === 0 ? (
            <Tr>
              <Td colSpan={4} className="py-8 text-center text-slate-400">
                Nenhum segmento cadastrado ainda.
              </Td>
            </Tr>
          ) : (
            segments.map((s) => (
              <Tr key={s.id}>
                <Td className="font-medium text-slate-900">{s.name}</Td>
                <Td className="text-slate-500">{s.description}</Td>
                <Td>{s.contactCount}</Td>
                <Td>
                  <DropdownMenu>
                    <DropdownItem onClick={() => setEditing(s)}>Editar</DropdownItem>
                    <DropdownItem onClick={() => handleDelete(s.id)} className="text-red-600">
                      Remover
                    </DropdownItem>
                  </DropdownMenu>
                </Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>

      <SegmentFormDialog workspace={workspace} open={createOpen} onOpenChange={setCreateOpen} />
      {editing ? (
        <SegmentFormDialog
          workspace={workspace}
          segment={editing}
          open={Boolean(editing)}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      ) : null}
    </div>
  );
}
