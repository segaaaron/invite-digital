CREATE TABLE "venue_tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"label" varchar(80) NOT NULL,
	"capacity" integer NOT NULL,
	"shape" varchar(16) DEFAULT 'round' NOT NULL,
	"x" numeric(5, 2) DEFAULT '50' NOT NULL,
	"y" numeric(5, 2) DEFAULT '50' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "venue_tables_capacity_positive" CHECK ("venue_tables"."capacity" >= 1)
);
--> statement-breakpoint
CREATE TABLE "venue_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"kind" varchar(16) NOT NULL,
	"label" varchar(80) NOT NULL,
	"x" numeric(5, 2) NOT NULL,
	"y" numeric(5, 2) NOT NULL,
	"w" numeric(5, 2) NOT NULL,
	"h" numeric(5, 2) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "guest_groups" ADD COLUMN "table_id" uuid;--> statement-breakpoint
ALTER TABLE "venue_tables" ADD CONSTRAINT "venue_tables_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_zones" ADD CONSTRAINT "venue_zones_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "venue_tables_event_idx" ON "venue_tables" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "venue_tables_label_unique" ON "venue_tables" USING btree ("event_id","label");--> statement-breakpoint
CREATE INDEX "venue_zones_event_idx" ON "venue_zones" USING btree ("event_id");--> statement-breakpoint
ALTER TABLE "guest_groups" ADD CONSTRAINT "guest_groups_table_id_venue_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."venue_tables"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "guest_groups_table_idx" ON "guest_groups" USING btree ("table_id");