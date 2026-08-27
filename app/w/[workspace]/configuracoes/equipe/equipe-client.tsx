"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FormAlert } from "@/components/ui/form-alert";
import { Dialog } from "@/components/ui/dialog";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/table";
import { cancelInvitation, inviteMember, removeMember, updateMemberRole, type ActionState } from "./actions";

interface Member {
  id: string;
  userId: string;
  role: string;
  user?: { email?: string; name?: string };
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
}

const ROLE_LABEL: Record<string, string> = { owner: "Proprietário", admin: "Administrador", member: "Membro" };
const initialState: ActionState = { ok: false };

export function EquipeClient({
  workspace,
  members,
  invitations,
  currentUserId,
  canManage,
}: {
  workspace: string;
  members: Member[];
  invitations: Invitation[];
  currentUserId: string;
  canManage: boolean;
}) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [state, formAction, pending] = useActionState(inviteMember.bind(null, workspace), initialState);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (state.ok) setInviteOpen(false);
  }, [state]);

  function handleRoleChange(memberId: string, role: string) {
    startTransition(async () => {
      const result = await updateMemberRole(workspace, memberId, role as "member" | "admin" | "owner");
      if (!result.ok) alert(result.error);
    });
  }

  function handleRemove(memberId: string) {
    if (!confirm("Remover este membro do workspace?")) return;
    startTransition(async () => {
      const result = await removeMember(workspace, memberId);
      if (!result.ok) alert(result.error);
    });
  }

  function handleCancelInvitation(id: string) {
    startTransition(async () => {
      const result = await cancelInvitation(workspace, id);
      if (!result.ok) alert(result.error);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Equipe</h1>
          <p className="text-sm text-slate-500">Pessoas com acesso a este workspace.</p>
        </div>
        {canManage ? (
          <Button onClick={() => setInviteOpen(true)}>
            <Plus className="h-4 w-4" /> Convidar
          </Button>
        ) : null}
      </div>

      <Table>
        <Thead>
          <Tr>
            <Th>Pessoa</Th>
            <Th>Papel</Th>
            <Th />
          </Tr>
        </Thead>
        <Tbody>
          {members.map((m) => (
            <Tr key={m.id}>
              <Td className="font-medium text-slate-900">
                {m.user?.name ?? m.user?.email ?? m.userId}
                {m.userId === currentUserId ? <span className="ml-2 text-xs text-slate-400">(você)</span> : null}
              </Td>
              <Td>
                {canManage && m.userId !== currentUserId ? (
                  <Select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.id, e.target.value)}
                    className="max-w-40"
                  >
                    <option value="member">Membro</option>
                    <option value="admin">Administrador</option>
                    <option value="owner">Proprietário</option>
                  </Select>
                ) : (
                  <Badge>{ROLE_LABEL[m.role] ?? m.role}</Badge>
                )}
              </Td>
              <Td>
                {canManage && m.userId !== currentUserId ? (
                  <button onClick={() => handleRemove(m.id)} className="text-sm text-red-600 hover:underline">
                    Remover
                  </button>
                ) : null}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      {invitations.length > 0 ? (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Convites pendentes</h2>
          <Table>
            <Thead>
              <Tr>
                <Th>E-mail</Th>
                <Th>Papel</Th>
                <Th />
              </Tr>
            </Thead>
            <Tbody>
              {invitations.map((i) => (
                <Tr key={i.id}>
                  <Td>{i.email}</Td>
                  <Td>{ROLE_LABEL[i.role] ?? i.role}</Td>
                  <Td>
                    {canManage ? (
                      <button
                        onClick={() => handleCancelInvitation(i.id)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Cancelar
                      </button>
                    ) : null}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      ) : null}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen} title="Convidar para o workspace">
        <form action={formAction} className="space-y-4">
          <FormAlert message={state.error} />
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div>
            <Label htmlFor="role">Papel</Label>
            <Select id="role" name="role" defaultValue="member">
              <option value="member">Membro</option>
              <option value="admin">Administrador</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Enviando…" : "Enviar convite"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
