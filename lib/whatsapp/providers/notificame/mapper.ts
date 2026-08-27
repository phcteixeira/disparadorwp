import type {
  ContactForSend,
  TemplateComponent,
  VariableMapping,
  VariableSource,
} from "@/lib/whatsapp/types";

export interface SendComponent {
  type: string;
  sub_type?: string;
  index?: string;
  parameters: Array<Record<string, unknown>>;
}

/** Extrai os números das variáveis posicionais {{1}}, {{2}}... presentes em um texto. */
export function extractPlaceholders(text: string | undefined): number[] {
  if (!text) return [];
  const matches = [...text.matchAll(/\{\{\s*(\d+)\s*\}\}/g)];
  return [...new Set(matches.map((m) => Number(m[1])))].sort((a, b) => a - b);
}

function resolveValue(entry: VariableSource | undefined, contact: ContactForSend): string {
  if (!entry) return "";
  if (entry.source === "static") return entry.value ?? "";
  switch (entry.field) {
    case "name":
      return contact.name;
    case "phone":
      return contact.phone;
    case "email":
      return contact.email ?? "";
    default:
      if (entry.field?.startsWith("custom.")) {
        const key = entry.field.slice("custom.".length);
        const value = contact.customFields[key];
        return value == null ? "" : String(value);
      }
      return "";
  }
}

/**
 * Converte os components de um template (formato Meta, com placeholders {{n}}) + o mapeamento
 * de variáveis da campanha + os dados de um contato específico no array `components` esperado
 * pelo envio de template da NotificaMe (positional parameters).
 *
 * Cobre variáveis de texto em HEADER (quando format = TEXT) e BODY — o caso comum de campanhas
 * de marketing. Headers de mídia e botões dinâmicos (URL/FLOW por contato) não são preenchidos
 * automaticamente: para uso em campanhas em massa o template deve manter esses componentes
 * estáticos.
 */
export function buildSendComponents(
  templateComponents: TemplateComponent[],
  variableMapping: VariableMapping,
  contact: ContactForSend,
): { components: SendComponent[]; renderedVariables: Record<string, string> } {
  const components: SendComponent[] = [];
  const renderedVariables: Record<string, string> = {};

  for (const component of templateComponents) {
    const type = (component.type ?? "").toUpperCase();
    const isTextHeader = type === "HEADER" && (component.format ?? "TEXT").toUpperCase() === "TEXT";
    if (type !== "BODY" && !isTextHeader) continue;

    const placeholders = extractPlaceholders(component.text);
    if (placeholders.length === 0) continue;

    const mapping = variableMapping[type];
    const parameters = placeholders.map((n) => {
      const value = resolveValue(mapping?.[n], contact);
      renderedVariables[`${type}.${n}`] = value;
      return { type: "text", text: value };
    });

    components.push({ type: type.toLowerCase(), parameters });
  }

  return { components, renderedVariables };
}
