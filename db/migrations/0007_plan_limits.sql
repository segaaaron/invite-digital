CREATE TABLE "plan_change_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"requested_plan_id" uuid NOT NULL,
	"note" text,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "plan_id" uuid;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "max_guest_groups" integer;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "includes_seating" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "includes_registry" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "includes_checkin" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "plan_change_requests" ADD CONSTRAINT "plan_change_requests_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_change_requests" ADD CONSTRAINT "plan_change_requests_requested_plan_id_plans_id_fk" FOREIGN KEY ("requested_plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "plan_change_pending_idx" ON "plan_change_requests" USING btree ("event_id") WHERE "plan_change_requests"."status" = 'pending';--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE set null ON UPDATE no action;