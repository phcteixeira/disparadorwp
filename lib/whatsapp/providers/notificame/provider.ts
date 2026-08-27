import { z } from "zod";
import type {
  ChannelHealth,
  NormalizedWebhookEvent,
  ProviderTemplate,
  SendResult,
  TemplateStatus,
  WhatsAppProvider,
} from "@/lib/whatsapp/types";
import { NotificaMeApiError, notificameClient } from "./client";
import { buildSendComponents } from "./mapper";

export const notificameConfigSchema = z.object({
  accountToken: z.string().min(10, "Token da conta parece inválido."),
  channelToken: z.string().min(3, "Token do canal parece inválido."),
});

type NotificaMeConfig = z.infer<typeof notificameConfigSchema>;

function parseConfig(config: Record<string, unknown>): NotificaMeConfig {
  return notificameConfigSchema.parse(config);
}

async function testConnection(config: Record<string, unknown>) {
  const { accountToken, channelToken } = parseConfig(config);
  try {
    const data = (await notificameClient.v2("/meta/health_status", accountToken, {
      method: "POST",
      body: { from: channelToken },
    })) as Record<string, unknown> | null;

    const health: ChannelHealth = {
      displayPhoneNumber: data?.display_phone_number as string | undefined,
      verifiedName: data?.verified_name as string | undefined,
      qualityRating: data?.quality_rating as string | undefined,
      platformType: data?.platform_type as string | undefined,
      throughputLevel: (data?.throughput as Record<string, unknown> | undefined)?.level as
        | string
        | undefined,
      checkedAt: new Date().toISOString(),
    };

    return { ok: true, health };
  } catch (err) {
    return { ok: false, error: describeError(err) };
  }
}

async function sendText(config: Record<string, unknown>, args: { to: string; text: string }) {
  const { accountToken, channelToken } = parseConfig(config);
  return send(accountToken, "/channels/whatsapp/messages", {
    from: channelToken,
    to: args.to,
    contents: [{ type: "text", text: args.text }],
  });
}

async function sendTemplate(
  config: Record<string, unknown>,
  args: Parameters<WhatsAppProvider["sendTemplate"]>[1],
): Promise<SendResult> {
  const { accountToken, channelToken } = parseConfig(config);
  const { components } = buildSendComponents(args.components, args.variableMapping, args.contact);

  return send(accountToken, "/channels/whatsapp/message_templates", {
    from: channelToken,
    to: args.to,
    type: "template",
    contents: [
      {
        type: "template",
        template: {
          name: args.templateName,
          language: { code: args.language, policy: "deterministic" },
          components,
        },
      },
    ],
    message_activity_sharing: true,
  });
}

async function send(accountToken: string, path: string, body: unknown): Promise<SendResult> {
  try {
    const data = (await notificameClient.v2(path, accountToken, {
      method: "POST",
      body,
    })) as Record<string, unknown> | null;

    return { ok: true, providerMessageId: data?.id as string | undefined, raw: data };
  } catch (err) {
    return { ok: false, error: describeError(err), raw: err instanceof NotificaMeApiError ? err.body : undefined };
  }
}

async function listTemplates(config: Record<string, unknown>): Promise<ProviderTemplate[]> {
  const { accountToken, channelToken } = parseConfig(config);
  const data = (await notificameClient.v1(`/templates/${channelToken}`, accountToken)) as {
    data?: Array<Record<string, unknown>>;
  } | null;

  return (data?.data ?? []).map((raw) => ({
    providerId: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    language: String(raw.language ?? ""),
    category: String(raw.category ?? "MARKETING"),
    status: (raw.status as TemplateStatus) ?? "PENDING",
    components: (raw.components as ProviderTemplate["components"]) ?? [],
  }));
}

async function createTemplate(
  config: Record<string, unknown>,
  payload: Parameters<WhatsAppProvider["createTemplate"]>[1],
) {
  const { accountToken, channelToken } = parseConfig(config);
  const data = (await notificameClient.v1(`/templates/${channelToken}`, accountToken, {
    method: "POST",
    body: {
      from: channelToken,
      contents: [
        {
          template: {
            name: payload.name,
            language: payload.language,
            category: payload.category,
            components: payload.components,
          },
        },
      ],
    },
  })) as { id?: string | number; status?: TemplateStatus } | null;

  return {
    providerId: String(data?.id ?? ""),
    status: data?.status ?? "PENDING",
  };
}

async function deleteTemplate(config: Record<string, unknown>, args: { name: string }) {
  const { accountToken, channelToken } = parseConfig(config);
  await notificameClient.v2(`/channels/whatsapp/templates/${channelToken}/${args.name}`, accountToken, {
    method: "DELETE",
  });
}

async function registerWebhook(config: Record<string, unknown>, args: { url: string }) {
  const { accountToken, channelToken } = parseConfig(config);
  await notificameClient.v1("/subscriptions/", accountToken, {
    method: "POST",
    body: { criteria: { channel: channelToken }, webhook: { url: args.url } },
  });
}

/**
 * O payload dos eventos recebidos no webhook não é documentado publicamente pela NotificaMe.
 * O handler sempre grava o payload bruto em `webhook_events`; este parser cobre os formatos
 * mais prováveis (mesmo shape do envio de mensagens, com `id`/`status`/`direction`) e deve ser
 * ajustado assim que payloads reais forem observados em produção.
 */
function parseWebhookEvent(rawPayload: unknown): NormalizedWebhookEvent {
  if (!rawPayload || typeof rawPayload !== "object") {
    return { kind: "unknown" };
  }
  const payload = rawPayload as Record<string, unknown>;

  if (typeof payload.status === "string" && (payload.id || payload.message_id)) {
    return {
      kind: "status",
      providerMessageId: String(payload.id ?? payload.message_id),
      status: payload.status,
      timestamp: (payload.timestamp as string | undefined) ?? new Date().toISOString(),
    };
  }

  if (payload.direction === "IN") {
    return { kind: "inbound", providerMessageId: payload.id as string | undefined };
  }

  return { kind: "unknown" };
}

function describeError(err: unknown): string {
  if (err instanceof NotificaMeApiError) {
    const bodyMessage =
      err.body && typeof err.body === "object" ? (err.body as Record<string, unknown>).message : undefined;
    return typeof bodyMessage === "string" ? bodyMessage : err.message;
  }
  return err instanceof Error ? err.message : "Erro desconhecido ao chamar a API da NotificaMe.";
}

export const notificameProvider: WhatsAppProvider = {
  key: "notificame",
  label: "NotificaMe",
  configSchema: notificameConfigSchema,
  testConnection,
  sendText,
  sendTemplate,
  listTemplates,
  createTemplate,
  deleteTemplate,
  registerWebhook,
  parseWebhookEvent,
};
