CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'scheduled', 'sending', 'completed', 'canceled', 'failed');--> statement-breakpoint
CREATE TYPE "public"."connection_status" AS ENUM('disconnected', 'connected', 'error');--> statement-breakpoint
CREATE TYPE "public"."recipient_status" AS ENUM('pending', 'queued', 'sent', 'delivered', 'read', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."template_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'DISABLED', 'IN_APPEAL');--> statement-breakpoint
CREATE TABLE "campaign_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"phone_snapshot" text NOT NULL,
	"status" "recipient_status" DEFAULT 'pending' NOT NULL,
	"provider_message_id" text,
	"error" text,
	"rendered_variables" jsonb,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"connection_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"segment_id" uuid,
	"name" text NOT NULL,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"variable_mapping" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" text NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_segments" (
	"contact_id" uuid NOT NULL,
	"segment_id" uuid NOT NULL,
	CONSTRAINT "contact_segments_contact_id_segment_id_pk" PRIMARY KEY("contact_id","segment_id")
);
--> statement-breakpoint
CREATE TABLE "contact_tags" (
	"contact_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "contact_tags_contact_id_tag_id_pk" PRIMARY KEY("contact_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"notes" text,
	"custom_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#64748b' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"parsed" jsonb,
	"processed" boolean DEFAULT false NOT NULL,
	"error" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"provider" text DEFAULT 'notificame' NOT NULL,
	"name" text NOT NULL,
	"config" text NOT NULL,
	"status" "connection_status" DEFAULT 'disconnected' NOT NULL,
	"health" jsonb,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"connection_id" uuid NOT NULL,
	"provider_template_id" text,
	"name" text NOT NULL,
	"language" text NOT NULL,
	"category" text NOT NULL,
	"status" "template_status" DEFAULT 'PENDING' NOT NULL,
	"components" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_connection_id_whatsapp_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."whatsapp_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_template_id_whatsapp_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."whatsapp_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_segment_id_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_segments" ADD CONSTRAINT "contact_segments_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_segments" ADD CONSTRAINT "contact_segments_segment_id_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_tags" ADD CONSTRAINT "contact_tags_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_tags" ADD CONSTRAINT "contact_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_connection_id_whatsapp_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."whatsapp_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_templates" ADD CONSTRAINT "whatsapp_templates_connection_id_whatsapp_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."whatsapp_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_recipients_campaign_contact_unique" ON "campaign_recipients" USING btree ("campaign_id","contact_id");--> statement-breakpoint
CREATE INDEX "campaign_recipients_campaign_status_idx" ON "campaign_recipients" USING btree ("campaign_id","status");--> statement-breakpoint
CREATE INDEX "campaign_recipients_provider_message_idx" ON "campaign_recipients" USING btree ("provider_message_id");--> statement-breakpoint
CREATE INDEX "campaigns_org_idx" ON "campaigns" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "campaigns_status_scheduled_idx" ON "campaigns" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX "contacts_org_idx" ON "contacts" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_org_phone_unique" ON "contacts" USING btree ("organization_id","phone");--> statement-breakpoint
CREATE INDEX "segments_org_idx" ON "segments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "tags_org_idx" ON "tags" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_org_name_unique" ON "tags" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "webhook_events_connection_idx" ON "webhook_events" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "whatsapp_connections_org_idx" ON "whatsapp_connections" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "whatsapp_templates_org_idx" ON "whatsapp_templates" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "whatsapp_templates_connection_name_lang_unique" ON "whatsapp_templates" USING btree ("connection_id","name","language");