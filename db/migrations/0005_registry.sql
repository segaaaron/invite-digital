CREATE TABLE "fund_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fund_id" uuid NOT NULL,
	"guest_group_id" uuid,
	"display_name" varchar(160) NOT NULL,
	"amount_cents" integer NOT NULL,
	"method" varchar(16) NOT NULL,
	"message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fund_contributions_amount_positive" CHECK ("fund_contributions"."amount_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "gift_funds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text,
	"goal_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gift_funds_goal_positive" CHECK ("gift_funds"."goal_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "gifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"price_cents" integer NOT NULL,
	"store" varchar(120),
	"url" text,
	"status" varchar(16) DEFAULT 'available' NOT NULL,
	"claimed_by_group_id" uuid,
	"claimed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gifts_price_positive" CHECK ("gifts"."price_cents" > 0)
);
--> statement-breakpoint
ALTER TABLE "fund_contributions" ADD CONSTRAINT "fund_contributions_fund_id_gift_funds_id_fk" FOREIGN KEY ("fund_id") REFERENCES "public"."gift_funds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_contributions" ADD CONSTRAINT "fund_contributions_guest_group_id_guest_groups_id_fk" FOREIGN KEY ("guest_group_id") REFERENCES "public"."guest_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_funds" ADD CONSTRAINT "gift_funds_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_claimed_by_group_id_guest_groups_id_fk" FOREIGN KEY ("claimed_by_group_id") REFERENCES "public"."guest_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fund_contributions_fund_idx" ON "fund_contributions" USING btree ("fund_id");--> statement-breakpoint
CREATE INDEX "gift_funds_event_idx" ON "gift_funds" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "gifts_event_idx" ON "gifts" USING btree ("event_id");