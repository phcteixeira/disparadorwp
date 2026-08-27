import Papa from "papaparse";

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
  errors: string[];
}

/** Faz o parse de um CSV (com cabeçalho) em linhas de objetos chave/valor. */
export function parseCsv(csvText: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  return {
    headers: result.meta.fields ?? [],
    rows: result.data,
    errors: result.errors.map((e) => `Linha ${(e.row ?? 0) + 2}: ${e.message}`),
  };
}
