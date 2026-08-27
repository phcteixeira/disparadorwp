"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormAlert } from "@/components/ui/form-alert";
import { extractPlaceholders } from "@/lib/whatsapp/providers/notificame/mapper";
import type { TemplateComponent } from "@/lib/whatsapp/types";
import type { WhatsappConnection } from "@/lib/db/schema";
import { createTemplateDraft, type ActionState } from "../actions";

const LANGUAGES = [
  { code: "pt_BR", label: "Português (Brasil)" },
  { code: "en_US", label: "Inglês (EUA)" },
  { code: "es_ES", label: "Espanhol (Espanha)" },
  { code: "es_AR", label: "Espanhol (Argentina)" },
];

const STEPS = ["Informações", "Cabeçalho", "Corpo", "Rodapé", "Botões", "Revisão"];
const initialState: ActionState = { ok: false };

export function TemplateWizard({ workspace, connections }: { workspace: string; connections: WhatsappConnection[] }) {
  const [step, setStep] = useState(0);
  const [connectionId, setConnectionId] = useState(connections[0]?.id ?? "");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"MARKETING" | "UTILITY" | "AUTHENTICATION">("MARKETING");
  const [language, setLanguage] = useState("pt_BR");
  const [headerType, setHeaderType] = useState<"none" | "text">("none");
  const [headerText, setHeaderText] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [bodyExamples, setBodyExamples] = useState<Record<number, string>>({});
  const [footerText, setFooterText] = useState("");
  const [buttons, setButtons] = useState<string[]>([]);

  const headerPlaceholders = extractPlaceholders(headerText);
  const bodyPlaceholders = extractPlaceholders(bodyText);

  const components = useMemo<TemplateComponent[]>(() => {
    const list: TemplateComponent[] = [];
    if (headerType === "text" && headerText.trim()) {
      list.push({
        type: "HEADER",
        format: "TEXT",
        text: headerText,
        ...(headerPlaceholders.length
          ? { example: { header_text: headerPlaceholders.map((n) => bodyExamples[n] || `exemplo${n}`) } }
          : {}),
      });
    }
    if (bodyText.trim()) {
      list.push({
        type: "BODY",
        text: bodyText,
        ...(bodyPlaceholders.length
          ? { example: { body_text: [bodyPlaceholders.map((n) => bodyExamples[n] || `exemplo${n}`)] } }
          : {}),
      });
    }
    if (footerText.trim()) {
      list.push({ type: "FOOTER", text: footerText });
    }
    const activeButtons = buttons.map((b) => b.trim()).filter(Boolean);
    if (activeButtons.length > 0) {
      list.push({
        type: "BUTTONS",
        buttons: activeButtons.map((text) => ({ type: "QUICK_REPLY", text })),
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerType, headerText, bodyText, footerText, buttons, JSON.stringify(bodyExamples)]);

  const action = createTemplateDraft.bind(null, workspace);
  const [state, formAction, pending] = useActionState(action, initialState);

  const canAdvance = (() => {
    if (step === 0) return connectionId && /^[a-z0-9_]+$/.test(name);
    if (step === 2) return bodyText.trim().length > 0;
    return true;
  })();

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Novo template ({STEPS[step]})</CardTitle>
        <CardDescription>
          Etapa {step + 1} de {STEPS.length}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormAlert message={state.error} />

        {step === 0 ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="connectionId">Conexão</Label>
              <Select id="connectionId" value={connectionId} onChange={(e) => setConnectionId(e.target.value)}>
                {connections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="name">Nome do template</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                placeholder="promo_black_friday"
                required
              />
              <p className="mt-1 text-xs text-slate-400">Apenas letras minúsculas, números e underscore.</p>
            </div>
            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select id="category" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
                <option value="MARKETING">Marketing</option>
                <option value="UTILITY">Utilidade</option>
                <option value="AUTHENTICATION">Autenticação</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="language">Idioma</Label>
              <Select id="language" value={language} onChange={(e) => setLanguage(e.target.value)}>
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="headerType">Tipo de cabeçalho</Label>
              <Select id="headerType" value={headerType} onChange={(e) => setHeaderType(e.target.value as typeof headerType)}>
                <option value="none">Sem cabeçalho</option>
                <option value="text">Texto</option>
              </Select>
            </div>
            {headerType === "text" ? (
              <>
                <div>
                  <Label htmlFor="headerText">Texto do cabeçalho</Label>
                  <Input id="headerText" value={headerText} onChange={(e) => setHeaderText(e.target.value)} placeholder="Olá {{1}}!" />
                </div>
                {headerPlaceholders.map((n) => (
                  <div key={n}>
                    <Label htmlFor={`h-ex-${n}`}>Exemplo para {"{{" + n + "}}"}</Label>
                    <Input
                      id={`h-ex-${n}`}
                      value={bodyExamples[n] ?? ""}
                      onChange={(e) => setBodyExamples((prev) => ({ ...prev, [n]: e.target.value }))}
                    />
                  </div>
                ))}
              </>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="bodyText">Corpo da mensagem</Label>
              <Textarea
                id="bodyText"
                rows={4}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Olá {{1}}, sua oferta especial de {{2}}% de desconto está disponível!"
                required
              />
              <p className="mt-1 text-xs text-slate-400">
                Use {"{{1}}"}, {"{{2}}"}… para variáveis — serão preenchidas por contato ao usar o template numa campanha.
              </p>
            </div>
            {bodyPlaceholders.map((n) => (
              <div key={n}>
                <Label htmlFor={`b-ex-${n}`}>Exemplo para {"{{" + n + "}}"}</Label>
                <Input
                  id={`b-ex-${n}`}
                  value={bodyExamples[n] ?? ""}
                  onChange={(e) => setBodyExamples((prev) => ({ ...prev, [n]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            <Label htmlFor="footerText">Rodapé (opcional)</Label>
            <Input id="footerText" value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="Equipe de vendas" />
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-2">
            <Label>Botões de resposta rápida (opcional, até 3)</Label>
            {buttons.map((b, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={b}
                  onChange={(e) =>
                    setButtons((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
                  }
                  placeholder={`Botão ${i + 1}`}
                />
                <Button type="button" variant="outline" onClick={() => setButtons((prev) => prev.filter((_, idx) => idx !== i))}>
                  Remover
                </Button>
              </div>
            ))}
            {buttons.length < 3 ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setButtons((prev) => [...prev, ""])}>
                Adicionar botão
              </Button>
            ) : null}
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-emerald-50 p-4">
              <div className="max-w-xs rounded-lg bg-white p-3 text-sm shadow">
                {headerType === "text" && headerText ? <p className="mb-1 font-semibold">{headerText}</p> : null}
                <p className="whitespace-pre-wrap">{bodyText}</p>
                {footerText ? <p className="mt-1 text-xs text-slate-400">{footerText}</p> : null}
                {buttons.filter(Boolean).length > 0 ? (
                  <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
                    {buttons.filter(Boolean).map((b, i) => (
                      <p key={i} className="text-center text-xs font-medium text-emerald-700">
                        {b}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Ao enviar, o template é criado na NotificaMe/Meta e fica com status &quot;Em análise&quot; até a
              aprovação.
            </p>
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="justify-between">
        <Button type="button" variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          Voltar
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={() => setStep((s) => s + 1)} disabled={!canAdvance}>
            Próximo
          </Button>
        ) : (
          <form action={formAction}>
            <input type="hidden" name="connectionId" value={connectionId} />
            <input type="hidden" name="name" value={name} />
            <input type="hidden" name="category" value={category} />
            <input type="hidden" name="language" value={language} />
            <input type="hidden" name="componentsJson" value={JSON.stringify(components)} />
            <Button type="submit" disabled={pending}>
              {pending ? "Enviando…" : "Criar template"}
            </Button>
          </form>
        )}
      </CardFooter>
    </Card>
  );
}
