"use client";

import { useActionState, useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { FormAlert } from "@/components/ui/form-alert";
import { MultiSelect } from "@/components/multi-select";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/components/ui/table";
import { parseCsv } from "@/lib/csv";
import type { Segment, Tag } from "@/lib/db/schema";
import { importContacts, type ImportState } from "./actions";

const initialState: ImportState = { ok: false };

export function ImportDialog({
  workspace,
  tags,
  segments,
  open,
  onOpenChange,
}: {
  workspace: string;
  tags: Tag[];
  segments: Segment[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [csvText, setCsvText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [nameColumn, setNameColumn] = useState("");
  const [phoneColumn, setPhoneColumn] = useState("");
  const [emailColumn, setEmailColumn] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);

  const action = importContacts.bind(null, workspace);
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (!open) {
      setCsvText("");
      setHeaders([]);
      setPreview([]);
      setNameColumn("");
      setPhoneColumn("");
      setEmailColumn("");
      setFileError(null);
    }
  }, [open]);

  async function handleFile(file: File) {
    setFileError(null);
    const text = await file.text();
    const { headers: h, rows, errors } = parseCsv(text);
    if (h.length === 0) {
      setFileError("Não foi possível ler colunas neste arquivo. Confirme que é um CSV com cabeçalho.");
      return;
    }
    setCsvText(text);
    setHeaders(h);
    setPreview(rows.slice(0, 5));
    setNameColumn(h.find((c) => /nome/i.test(c)) ?? h[0] ?? "");
    setPhoneColumn(h.find((c) => /telefone|celular|whats|phone/i.test(c)) ?? h[1] ?? h[0] ?? "");
    setEmailColumn(h.find((c) => /e-?mail/i.test(c)) ?? "");
    if (errors.length > 0) setFileError(errors[0] ?? null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Importar contatos"
      description="Envie um CSV com cabeçalho. Contatos com o mesmo telefone já cadastrados serão atualizados."
      className="max-w-2xl"
    >
      {!state.summary ? (
        <form action={formAction} className="space-y-4">
          <FormAlert message={state.error ?? fileError} />
          <input type="hidden" name="csv" value={csvText} />

          <div>
            <Label htmlFor="csv-file">Arquivo CSV</Label>
            <input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-emerald-700"
            />
          </div>

          {headers.length > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="nameColumn">Coluna do nome</Label>
                  <Select id="nameColumn" name="nameColumn" value={nameColumn} onChange={(e) => setNameColumn(e.target.value)}>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="phoneColumn">Coluna do telefone</Label>
                  <Select id="phoneColumn" name="phoneColumn" value={phoneColumn} onChange={(e) => setPhoneColumn(e.target.value)}>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="emailColumn">Coluna do e-mail</Label>
                  <Select id="emailColumn" name="emailColumn" value={emailColumn} onChange={(e) => setEmailColumn(e.target.value)}>
                    <option value="">(nenhuma)</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div>
                <p className="mb-1 text-sm font-medium text-slate-700">Pré-visualização</p>
                <Table>
                  <Thead>
                    <Tr>
                      {headers.map((h) => (
                        <Th key={h}>{h}</Th>
                      ))}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {preview.map((row, i) => (
                      <Tr key={i}>
                        {headers.map((h) => (
                          <Td key={h}>{row[h]}</Td>
                        ))}
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </div>

              <div>
                <Label>Aplicar tags a todos os importados</Label>
                <MultiSelect
                  name="tagIds"
                  options={tags.map((t) => ({ id: t.id, label: t.name, color: t.color }))}
                  placeholder="Selecionar tags…"
                />
              </div>
              <div>
                <Label htmlFor="newTags">Novas tags (separadas por vírgula)</Label>
                <Input id="newTags" name="newTags" placeholder="importado-csv" />
              </div>
              <div>
                <Label>Adicionar a segmentos</Label>
                <MultiSelect
                  name="segmentIds"
                  options={segments.map((s) => ({ id: s.id, label: s.name }))}
                  placeholder="Selecionar segmentos…"
                />
              </div>
            </>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending || headers.length === 0}>
              {pending ? "Importando…" : "Importar"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-700">
            <strong>{state.summary.created}</strong> criados, <strong>{state.summary.updated}</strong>{" "}
            atualizados, <strong>{state.summary.skipped}</strong> ignorados.
          </p>
          {state.summary.errors.length > 0 ? (
            <div className="max-h-40 overflow-y-auto rounded-md bg-red-50 p-3 text-xs text-red-700">
              {state.summary.errors.map((e, i) => (
                <p key={i}>{e}</p>
              ))}
            </div>
          ) : null}
          <div className="flex justify-end pt-2">
            <Button onClick={() => onOpenChange(false)}>Concluir</Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
