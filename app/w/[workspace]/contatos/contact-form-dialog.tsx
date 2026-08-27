"use client";

import { useActionState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormAlert } from "@/components/ui/form-alert";
import { MultiSelect } from "@/components/multi-select";
import type { Segment, Tag } from "@/lib/db/schema";
import type { ContactWithRelations } from "@/lib/contacts/queries";
import { createContact, updateContact, type ActionState } from "./actions";

const initialState: ActionState = { ok: false };

export function ContactFormDialog({
  workspace,
  tags,
  segments,
  contact,
  open,
  onOpenChange,
}: {
  workspace: string;
  tags: Tag[];
  segments: Segment[];
  contact?: ContactWithRelations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const action = contact
    ? updateContact.bind(null, workspace, contact.id)
    : createContact.bind(null, workspace);
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.ok) onOpenChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={contact ? "Editar contato" : "Novo contato"}>
      <form action={formAction} className="space-y-4" key={contact?.id ?? "new"}>
        <FormAlert message={state.error} />
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" defaultValue={contact?.name} required />
        </div>
        <div>
          <Label htmlFor="phone">Telefone (WhatsApp)</Label>
          <Input id="phone" name="phone" defaultValue={contact?.phone} placeholder="(11) 98888-7777" required />
        </div>
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" defaultValue={contact?.email ?? ""} />
        </div>
        <div>
          <Label>Tags</Label>
          <MultiSelect
            name="tagIds"
            options={tags.map((t) => ({ id: t.id, label: t.name, color: t.color }))}
            defaultValue={contact?.tags.map((t) => t.id) ?? []}
            placeholder="Selecionar tags…"
            emptyLabel="Nenhuma tag cadastrada ainda"
          />
        </div>
        <div>
          <Label htmlFor="newTags">Novas tags (separadas por vírgula)</Label>
          <Input id="newTags" name="newTags" placeholder="cliente-vip, black-friday" />
        </div>
        <div>
          <Label>Segmentos</Label>
          <MultiSelect
            name="segmentIds"
            options={segments.map((s) => ({ id: s.id, label: s.name }))}
            defaultValue={contact?.segments.map((s) => s.id) ?? []}
            placeholder="Selecionar segmentos…"
            emptyLabel="Nenhum segmento cadastrado ainda"
          />
        </div>
        <div>
          <Label htmlFor="notes">Notas</Label>
          <Textarea id="notes" name="notes" rows={2} defaultValue={contact?.notes ?? ""} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
