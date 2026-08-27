"use client";

import { useActionState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormAlert } from "@/components/ui/form-alert";
import type { Segment } from "@/lib/db/schema";
import { createSegment, updateSegment, type ActionState } from "./actions";

const initialState: ActionState = { ok: false };

export function SegmentFormDialog({
  workspace,
  segment,
  open,
  onOpenChange,
}: {
  workspace: string;
  segment?: Segment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const action = segment
    ? updateSegment.bind(null, workspace, segment.id)
    : createSegment.bind(null, workspace);
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.ok) onOpenChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={segment ? "Editar segmento" : "Novo segmento"}>
      <form action={formAction} className="space-y-4" key={segment?.id ?? "new"}>
        <FormAlert message={state.error} />
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" defaultValue={segment?.name} required />
        </div>
        <div>
          <Label htmlFor="description">Descrição</Label>
          <Textarea id="description" name="description" rows={3} defaultValue={segment?.description ?? ""} />
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
