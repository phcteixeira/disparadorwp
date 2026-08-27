"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { FormAlert } from "@/components/ui/form-alert";
import { extractPlaceholders } from "@/lib/whatsapp/providers/notificame/mapper";
import type { VariableMapping, VariableSource } from "@/lib/whatsapp/types";
import type { Campaign, WhatsappConnection, WhatsappTemplate } from "@/lib/db/schema";
import type { SegmentWithCount } from "@/lib/segments/queries";
import { utcToZonedInputValue } from "@/lib/timezone";
import { createCampaign, updateCampaign, type ActionState } from "./actions";

const initialState: ActionState = { ok: false };

const CONTACT_FIELDS = [
  { value: "name", label: "Nome do contato" },
  { value: "phone", label: "Telefone do contato" },
  { value: "email", label: "E-mail do contato" },
];

export function CampaignForm({
  workspace,
  timezone,
  connections,
  templates,
  segments,
  campaign,
}: {
  workspace: string;
  timezone: string;
  connections: WhatsappConnection[];
  templates: WhatsappTemplate[];
  segments: SegmentWithCount[];
  campaign?: Campaign;
}) {
  const [connectionId, setConnectionId] = useState(campaign?.connectionId ?? connections[0]?.id ?? "");
  const [templateId, setTemplateId] = useState(campaign?.templateId ?? "");
  const [segmentId, setSegmentId] = useState(campaign?.segmentId ?? segments[0]?.id ?? "");
  const [scheduleMode, setScheduleMode] = useState<"draft" | "now" | "later">(
    campaign ? (campaign.scheduledAt ? "later" : "draft") : "draft",
  );
  const [scheduledAtLocal, setScheduledAtLocal] = useState(
    campaign?.scheduledAt ? utcToZonedInputValue(campaign.scheduledAt, timezone) : "",
  );
  const [mapping, setMapping] = useState<VariableMapping>(campaign?.variableMapping ?? {});

  const availableTemplates = templates.filter((t) => t.connectionId === connectionId && t.status === "APPROVED");
  const template = templates.find((t) => t.id === templateId);

  const variableSlots = useMemo(() => {
    if (!template) return [] as Array<{ componentType: string; index: number; text: string }>;
    const slots: Array<{ componentType: string; index: number; text: string }> = [];
    for (const c of template.components) {
      const type = (c.type ?? "").toUpperCase();
      const isTextHeader = type === "HEADER" && (c.format ?? "TEXT").toUpperCase() === "TEXT";
      if (type !== "BODY" && !isTextHeader) continue;
      for (const n of extractPlaceholders(c.text)) slots.push({ componentType: type, index: n, text: c.text ?? "" });
    }
    return slots;
  }, [template]);

  function setSlot(componentType: string, index: number, entry: VariableSource) {
    setMapping((prev) => ({ ...prev, [componentType]: { ...prev[componentType], [index]: entry } }));
  }

  const action = campaign ? updateCampaign.bind(null, workspace, campaign.id) : createCampaign.bind(null, workspace);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{campaign ? "Editar campanha" : "Nova campanha"}</CardTitle>
        <CardDescription>Selecione o template aprovado, o público-alvo e quando enviar.</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <input type="hidden" name="variableMappingJson" value={JSON.stringify(mapping)} />
        <CardContent className="space-y-4">
          <FormAlert message={state.error} />

          <div>
            <Label htmlFor="name">Nome da campanha</Label>
            <Input id="name" name="name" defaultValue={campaign?.name} required />
          </div>

          <div>
            <Label htmlFor="connectionId">Conexão</Label>
            <Select id="connectionId" name="connectionId" value={connectionId} onChange={(e) => setConnectionId(e.target.value)}>
              {connections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="templateId">Template</Label>
            <Select id="templateId" name="templateId" value={templateId} onChange={(e) => setTemplateId(e.target.value)} required>
              <option value="">Selecione…</option>
              {availableTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.language})
                </option>
              ))}
            </Select>
            {availableTemplates.length === 0 ? (
              <p className="mt-1 text-xs text-amber-600">
                Nenhum template aprovado nesta conexão ainda. Crie e aguarde a aprovação em Templates Meta.
              </p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="segmentId">Público-alvo (segmento)</Label>
            <Select id="segmentId" name="segmentId" value={segmentId} onChange={(e) => setSegmentId(e.target.value)} required>
              <option value="">Selecione…</option>
              {segments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.contactCount} contato{s.contactCount === 1 ? "" : "s"})
                </option>
              ))}
            </Select>
          </div>

          {variableSlots.length > 0 ? (
            <div className="space-y-3 rounded-md border border-slate-200 p-3">
              <p className="text-sm font-medium text-slate-700">Variáveis do template</p>
              {variableSlots.map((slot) => {
                const current = mapping[slot.componentType]?.[slot.index];
                const source = current?.source ?? "contact_field";
                return (
                  <div key={`${slot.componentType}-${slot.index}`} className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>
                        {slot.componentType === "HEADER" ? "Cabeçalho" : "Corpo"} — {"{{" + slot.index + "}}"}
                      </Label>
                      <Select
                        value={source === "static" ? "static" : (current?.field ?? "name")}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "static") {
                            setSlot(slot.componentType, slot.index, { source: "static", value: current?.value ?? "" });
                          } else {
                            setSlot(slot.componentType, slot.index, { source: "contact_field", field: value });
                          }
                        }}
                      >
                        {CONTACT_FIELDS.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                        <option value="static">Texto fixo</option>
                      </Select>
                    </div>
                    {source === "static" ? (
                      <div>
                        <Label>Texto</Label>
                        <Input
                          value={current?.value ?? ""}
                          onChange={(e) => setSlot(slot.componentType, slot.index, { source: "static", value: e.target.value })}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}

          <div>
            <Label>Agendamento</Label>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="scheduleMode"
                  value="draft"
                  checked={scheduleMode === "draft"}
                  onChange={() => setScheduleMode("draft")}
                />
                Salvar como rascunho
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="scheduleMode"
                  value="now"
                  checked={scheduleMode === "now"}
                  onChange={() => setScheduleMode("now")}
                />
                Enviar agora
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  name="scheduleMode"
                  value="later"
                  checked={scheduleMode === "later"}
                  onChange={() => setScheduleMode("later")}
                />
                Agendar
              </label>
            </div>
            {scheduleMode === "later" ? (
              <div className="mt-2">
                <Input
                  type="datetime-local"
                  name="scheduledAtLocal"
                  value={scheduledAtLocal}
                  onChange={(e) => setScheduledAtLocal(e.target.value)}
                  required
                />
                <p className="mt-1 text-xs text-slate-400">Horário no fuso do workspace ({timezone}).</p>
              </div>
            ) : null}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando…" : "Salvar campanha"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
