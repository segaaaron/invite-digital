CREATE TABLE "arrivals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"guest_group_id" uuid NOT NULL,
	"arrived_count" integer NOT NULL,
	"scanned_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"voided_at" timestamp with time zone,
	CONSTRAINT "arrivals_scan_id_unique" UNIQUE("scan_id")
);
--> statement-breakpoint
ALTER TABLE "arrivals" ADD CONSTRAINT "arrivals_guest_group_id_guest_groups_id_fk" FOREIGN KEY ("guest_group_id") REFERENCES "public"."guest_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "arrivals_group_idx" ON "arrivals" USING btree ("guest_group_id","scanned_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "arrivals" ADD CONSTRAINT "arrivals_count_positive" CHECK ("arrived_count" >= 1);--> statement-breakpoint
CREATE INDEX "arrivals_live_idx" ON "arrivals" ("guest_group_id") WHERE "voided_at" IS NULL;
