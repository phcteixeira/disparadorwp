import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  ChannelHealth,
  ContactForSend,
  NormalizedWebhookEvent,
  TemplateComponent,
  TemplateStatus,
  VariableMapping,
} from "@/lib/whatsapp/types";

/**
 * As tabelas de usuários/organizações/membros/convites são gerenciadas pelo Neon Auth
 * (schema `neon_auth`) e não fazem parte destas migrations. Nossas tabelas referenciam
 * `organizationId`/`userId` como texto simples (sem FK física cross-schema) — são os
 * mesmos ids gerados pelo Better Auth (`organization.id`, `user.id`).
 */

export const connectionStatusEnum = pgEnum("connection_status", [
  "disconnected",
  "connected",
  "error",
]);

export const templateStatusEnum = pgEnum("template_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "PAUSED",
  "DISABLED",
  "IN_APPEAL",
]);

export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft",
  "scheduled",
  "sending",
  "completed",
  "canceled",
  "failed",
]);

export const recipientStatusEnum = pgEnum("recipient_status", [
  "pending",
  "queued",
  "sent",
  "delivered",
  "read",
  "failed",
  "skipped",
]);

export const whatsappConnections = pgTable(
  "whatsapp_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id").notNull(),
    provider: text("provider").notNull().default("notificame"),
    name: text("name").notNull(),
    /** Criptografado em repouso — ver lib/crypto.ts. Nunca enviar ao client. */
    config: text("config").notNull(),
    status: connectionStatusEnum("status").notNull().default("disconnected"),
    health: jsonb("health").$type<ChannelHealth>(),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("whatsapp_connections_org_idx").on(t.organizationId)],
);

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id").notNull(),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    notes: text("notes"),
    customFields: jsonb("custom_fields").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("contacts_org_idx").on(t.organizationId),
    uniqueIndex("contacts_org_phone_unique").on(t.organizationId, t.phone),
  ],
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id").notNull(),
    name: text("name").notNull(),
    color: text("color").notNull().default("#64748b"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("tags_org_idx").on(t.organizationId),
    uniqueIndex("tags_org_name_unique").on(t.organizationId, t.name),
  ],
);

export const contactTags = pgTable(
  "contact_tags",
  {
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.contactId, t.tagId] })],
);

export const segments = pgTable(
  "segments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("segments_org_idx").on(t.organizationId)],
);

export const contactSegments = pgTable(
  "contact_segments",
  {
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    segmentId: uuid("segment_id")
      .notNull()
      .references(() => segments.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.contactId, t.segmentId] })],
);

export const whatsappTemplates = pgTable(
  "whatsapp_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id").notNull(),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => whatsappConnections.id, { onDelete: "cascade" }),
    providerTemplateId: text("provider_template_id"),
    name: text("name").notNull(),
    language: text("language").notNull(),
    category: text("category").notNull(),
    status: templateStatusEnum("status").notNull().default("PENDING"),
    components: jsonb("components").$type<TemplateComponent[]>().notNull().default([]),
    synced_at: timestamp("synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("whatsapp_templates_org_idx").on(t.organizationId),
    uniqueIndex("whatsapp_templates_connection_name_lang_unique").on(
      t.connectionId,
      t.name,
      t.language,
    ),
  ],
);

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id").notNull(),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => whatsappConnections.id),
    templateId: uuid("template_id")
      .notNull()
      .references(() => whatsappTemplates.id),
    segmentId: uuid("segment_id").references(() => segments.id),
    name: text("name").notNull(),
    status: campaignStatusEnum("status").notNull().default("draft"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    variableMapping: jsonb("variable_mapping").$type<VariableMapping>().notNull().default({}),
    createdBy: text("created_by").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("campaigns_org_idx").on(t.organizationId),
    index("campaigns_status_scheduled_idx").on(t.status, t.scheduledAt),
  ],
);

export const campaignRecipients = pgTable(
  "campaign_recipients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
    phoneSnapshot: text("phone_snapshot").notNull(),
    status: recipientStatusEnum("status").notNull().default("pending"),
    providerMessageId: text("provider_message_id"),
    error: text("error"),
    renderedVariables: jsonb("rendered_variables").$type<Record<string, string>>(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("campaign_recipients_campaign_contact_unique").on(t.campaignId, t.contactId),
    index("campaign_recipients_campaign_status_idx").on(t.campaignId, t.status),
    index("campaign_recipients_provider_message_idx").on(t.providerMessageId),
  ],
);

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => whatsappConnections.id, { onDelete: "cascade" }),
    payload: jsonb("payload").notNull(),
    parsed: jsonb("parsed").$type<NormalizedWebhookEvent>(),
    processed: boolean("processed").notNull().default(false),
    error: text("error"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("webhook_events_connection_idx").on(t.connectionId)],
);

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type Segment = typeof segments.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type WhatsappConnection = typeof whatsappConnections.$inferSelect;
export type WhatsappTemplate = typeof whatsappTemplates.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type CampaignRecipient = typeof campaignRecipients.$inferSelect;
export type ContactForSendType = ContactForSend;
export type { TemplateStatus };
