import type { ZodType } from "zod";

/** Um componente de template no formato do Meta (HEADER/BODY/FOOTER/BUTTONS). */
export interface TemplateComponent {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS" | string;
  format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT" | string;
  text?: string;
  example?: {
    header_text?: string[];
    body_text?: string[][];
    [key: string]: unknown;
  };
  buttons?: Array<{
    type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER" | "FLOW" | string;
    text: string;
    url?: string;
    phone_number?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export type TemplateStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "PAUSED"
  | "DISABLED"
  | "IN_APPEAL";

export interface ProviderTemplate {
  providerId: string;
  name: string;
  language: string;
  category: string;
  status: TemplateStatus;
  components: TemplateComponent[];
}

export interface VariableSource {
  source: "contact_field" | "static";
  /** Quando source = contact_field: "name" | "phone" | "email" | "custom.<chave>" */
  field?: string;
  /** Quando source = static */
  value?: string;
}

/**
 * Mapeia cada variável {{n}} de cada componente (HEADER/BODY) do template para o campo do
 * contato ou um texto fixo. Ex.: `{ BODY: { 1: {source:'contact_field', field:'name'} } }`.
 */
export interface VariableMapping {
  [componentType: string]: {
    [placeholderIndex: number]: VariableSource;
  };
}

export interface ChannelHealth {
  displayPhoneNumber?: string;
  verifiedName?: string;
  qualityRating?: "GREEN" | "YELLOW" | "RED" | string;
  platformType?: string;
  throughputLevel?: string;
  checkedAt: string;
}

export interface SendResult {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
  raw?: unknown;
}

export interface NormalizedWebhookEvent {
  kind: "status" | "inbound" | "unknown";
  providerMessageId?: string;
  status?: string;
  timestamp?: string;
}

export interface ContactForSend {
  name: string;
  phone: string;
  email: string | null;
  customFields: Record<string, unknown>;
}

export interface WhatsAppProvider {
  key: string;
  label: string;
  configSchema: ZodType;

  testConnection(
    config: Record<string, unknown>,
  ): Promise<{ ok: boolean; health?: ChannelHealth; error?: string }>;

  sendText(
    config: Record<string, unknown>,
    args: { to: string; text: string },
  ): Promise<SendResult>;

  sendTemplate(
    config: Record<string, unknown>,
    args: {
      to: string;
      templateName: string;
      language: string;
      components: TemplateComponent[];
      variableMapping: VariableMapping;
      contact: ContactForSend;
    },
  ): Promise<SendResult>;

  listTemplates(config: Record<string, unknown>): Promise<ProviderTemplate[]>;

  createTemplate(
    config: Record<string, unknown>,
    payload: { name: string; language: string; category: string; components: TemplateComponent[] },
  ): Promise<{ providerId: string; status: TemplateStatus }>;

  deleteTemplate(config: Record<string, unknown>, args: { name: string }): Promise<void>;

  registerWebhook(config: Record<string, unknown>, args: { url: string }): Promise<void>;

  parseWebhookEvent(rawPayload: unknown): NormalizedWebhookEvent;
}
