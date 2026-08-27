"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { FormAlert } from "@/components/ui/form-alert";
import { deleteWorkspace, updateWorkspace, type ActionState } from "./actions";
import { TIMEZONES } from "./timezones";

const initialState: ActionState = { ok: false };

export function WorkspaceClient({
  workspace,
  name,
  timezone,
  canManage,
  isOwner,
}: {
  workspace: string;
  name: string;
  timezone: string;
  canManage: boolean;
  isOwner: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateWorkspace.bind(null, workspace), initialState);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Excluir permanentemente o workspace "${name}" e todos os seus dados?`)) return;
    setDeleting(true);
    const result = await deleteWorkspace(workspace);
    if (result && !result.ok) {
      alert(result.error);
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Workspace</h1>
        <p className="text-sm text-slate-500">Configurações gerais deste workspace.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados gerais</CardTitle>
          <CardDescription>Nome exibido e fuso horário usado para agendar campanhas.</CardDescription>
        </CardHeader>
        <form action={formAction}>
          <CardContent className="space-y-4">
            <FormAlert message={state.error} />
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" defaultValue={name} disabled={!canManage} required />
            </div>
            <div>
              <Label htmlFor="timezone">Fuso horário</Label>
              <Select id="timezone" name="timezone" defaultValue={timezone} disabled={!canManage}>
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </Select>
            </div>
          </CardContent>
          {canManage ? (
            <CardFooter>
              <Button type="submit" disabled={pending}>
                {pending ? "Salvando…" : "Salvar"}
              </Button>
            </CardFooter>
          ) : null}
        </form>
      </Card>

      {isOwner ? (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700">Excluir workspace</CardTitle>
            <CardDescription>
              Remove permanentemente este workspace e todos os seus dados (contatos, campanhas, templates).
              Essa ação não pode ser desfeita.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Excluindo…" : "Excluir workspace"}
            </Button>
          </CardFooter>
        </Card>
      ) : null}
    </div>
  );
}
