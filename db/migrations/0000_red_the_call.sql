CREATE TABLE "consultation_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"email" varchar(200),
	"phone" varchar(32),
	"category_id" uuid,
	"event_date" date,
	"message" text,
	"locale" varchar(5) NOT NULL,
	"utm" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "event_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "event_category_translations" (
	"category_id" uuid NOT NULL,
	"locale" varchar(5) NOT NULL,
	"name" varchar(120) NOT NULL,
	CONSTRAINT "event_category_translations_category_id_locale_pk" PRIMARY KEY("category_id","locale")
);
--> statement-breakpoint
CREATE TABLE "plan_translations" (
	"plan_id" uuid NOT NULL,
	"locale" varchar(5) NOT NULL,
	"name" varchar(120) NOT NULL,
	"tagline" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"features" jsonb NOT NULL,
	CONSTRAINT "plan_translations_plan_id_locale_pk" PRIMARY KEY("plan_id","locale")
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"price_cents" integer NOT NULL,
	"currency" char(3) DEFAULT 'BOB' NOT NULL,
	"highlighted" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plans_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "template_translations" (
	"template_id" uuid NOT NULL,
	"locale" varchar(5) NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text NOT NULL,
	CONSTRAINT "template_translations_template_id_locale_pk" PRIMARY KEY("template_id","locale")
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"category_id" uuid NOT NULL,
	"cover_image_path" varchar(255) NOT NULL,
	"palette" jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "templates_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "consultation_requests" ADD CONSTRAINT "consultation_requests_category_id_event_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."event_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_category_translations" ADD CONSTRAINT "event_category_translations_category_id_event_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."event_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_translations" ADD CONSTRAINT "plan_translations_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_translations" ADD CONSTRAINT "template_translations_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_category_id_event_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."event_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consultation_requests_created_idx" ON "consultation_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "templates_published_order_idx" ON "templates" USING btree ("is_published","sort_order");