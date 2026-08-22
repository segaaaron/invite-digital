CREATE TABLE "message_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rsvp_response_id" uuid NOT NULL,
	"read_at" timestamp with time zone,
	"featured_at" timestamp with time zone,
	"reply" text,
	"replied_at" timestamp with time zone,
	CONSTRAINT "message_notes_rsvp_response_id_unique" UNIQUE("rsvp_response_id")
);
--> statement-breakpoint
ALTER TABLE "message_notes" ADD CONSTRAINT "message_notes_rsvp_response_id_rsvp_responses_id_fk" FOREIGN KEY ("rsvp_response_id") REFERENCES "public"."rsvp_responses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_notes_featured_idx" ON "message_notes" USING btree ("featured_at") WHERE "message_notes"."featured_at" is not null;