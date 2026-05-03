CREATE TABLE "attribution_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attr_sid" text NOT NULL,
	"user_id" uuid,
	"first_utm_source" text,
	"first_utm_medium" text,
	"first_utm_campaign" text,
	"first_utm_term" text,
	"first_utm_content" text,
	"first_referer" text,
	"first_oblast" text,
	"first_country" text,
	"first_qr_flag" text,
	"first_landing_path" text,
	"first_seen_at" timestamp with time zone NOT NULL,
	"last_utm_source" text,
	"last_utm_medium" text,
	"last_utm_campaign" text,
	"last_utm_term" text,
	"last_utm_content" text,
	"last_referer" text,
	"last_oblast" text,
	"last_country" text,
	"last_qr_flag" text,
	"last_landing_path" text,
	"last_seen_at" timestamp with time zone NOT NULL,
	CONSTRAINT "attribution_events_attr_sid_unique" UNIQUE("attr_sid")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "self_reported_source" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "self_reported_other" text;--> statement-breakpoint
ALTER TABLE "attribution_events" ADD CONSTRAINT "attribution_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attr_events_sid_idx" ON "attribution_events" USING btree ("attr_sid");--> statement-breakpoint
CREATE INDEX "attr_events_user_idx" ON "attribution_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "attr_events_first_seen_idx" ON "attribution_events" USING btree ("first_seen_at");--> statement-breakpoint
CREATE INDEX "attr_events_utm_source_idx" ON "attribution_events" USING btree ("first_utm_source");--> statement-breakpoint
CREATE INDEX "attr_events_oblast_idx" ON "attribution_events" USING btree ("first_oblast");