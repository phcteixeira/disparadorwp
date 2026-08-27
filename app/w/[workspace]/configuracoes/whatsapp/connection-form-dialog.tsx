"use client";

import { useActionState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { FormAlert } from "@/components/ui/form-alert";
import { listProviders } from "@/lib/whatsapp/registry";
import { createConnection, type ActionState } from "./actions";

const initialState: ActionState = { ok: false };
const providers = listProviders();

export function ConnectionFormDialog({
  workspace,
  open,
  onOpenChange,
}: {
  workspace: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const action = createConnection.bind(null, workspace);
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.ok) onOpenChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Nova conexão de WhatsApp"
      description="As credenciais ficam criptografadas e nunca são exibidas depois de salvas."
    >
      <form action={formAction} className="space-y-4">
        <FormAlert message={state.error} />
        <div>
          <Label htmlFor="provider">Provedor</Label>
          <Select id="provider" name="provider" defaultValue={providers[0]?.key}>
            {providers.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="name">Nome desta conexão</Label>
          <Input id="name" name="name" placeholder="Ex.: Canal principal" required />
        </div>
        <div>
          <Label htmlFor="accountToken">Token da conta</Label>
          <Input id="accountToken" name="accountToken" required />
        </div>
        <div>
          <Label htmlFor="channelToken">Token do canal</Label>
          <Input id="channelToken" name="channelToken" required />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Conectando…" : "Conectar"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
