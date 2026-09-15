-- El planner del día: proveedores, cronograma, cortejo y ensayos. Y qué parte del planner
-- trae cada plan: `esencial` (tareas y presupuesto), `completo` (+ proveedores, cronograma,
-- cortejo y documentos), `total` (+ Día D y enlaces para proveedores).
alter table "plans" add column if not exists "planner_suite" varchar(16) not null default 'esencial';
alter table "plans" drop constraint if exists "plans_planner_suite_check";
alter table "plans" add constraint "plans_planner_suite_check" check ("planner_suite" in ('esencial', 'completo', 'total'));
update "plans" set "planner_suite" = 'completo' where "slug" = 'firma-3d' and "planner_suite" = 'esencial';
update "plans" set "planner_suite" = 'total' where "slug" = 'alta-costura' and "planner_suite" = 'esencial';

-- Un pago puede ser anticipo, cuota o saldo.
alter table "budget_payments" add column if not exists "label" varchar(16);

-- El dinero de un proveedor vive en su partida del presupuesto (`set null`: borrar la
-- partida no borra al proveedor). El enlace de solo lectura se guarda como hash.
create table if not exists "vendors" (
  "id" uuid primary key default gen_random_uuid(),
  "event_id" uuid not null references "events"("id") on delete cascade,
  "service" varchar(80) not null,
  "company" varchar(120),
  "contact_name" varchar(120),
  "whatsapp" varchar(20),
  "email" varchar(200),
  "status" varchar(16) not null default 'cotizando',
  "arrival_time" varchar(5),
  "setup_notes" text,
  "budget_item_id" uuid references "budget_items"("id") on delete set null,
  "access_token_hash" bytea unique,
  "created_at" timestamp with time zone not null default now()
);
create index if not exists "vendors_event_idx" on "vendors" ("event_id");
alter table "vendors" drop constraint if exists "vendors_status_check";
alter table "vendors" add constraint "vendors_status_check" check ("status" in ('cotizando', 'reservado', 'contratado', 'confirmado'));

create table if not exists "run_of_show" (
  "id" uuid primary key default gen_random_uuid(),
  "event_id" uuid not null references "events"("id") on delete cascade,
  "starts_at" varchar(5) not null,
  "duration_min" integer not null default 15,
  "title" varchar(160) not null,
  "place" varchar(120),
  "owner" varchar(120),
  "vendor_ids" uuid[] not null default '{}',
  "cue" varchar(200),
  "notes" text,
  "sort_order" integer not null default 0,
  "created_at" timestamp with time zone not null default now()
);
create index if not exists "run_of_show_event_idx" on "run_of_show" ("event_id");
alter table "run_of_show" drop constraint if exists "run_of_show_duration_check";
alter table "run_of_show" add constraint "run_of_show_duration_check" check ("duration_min" between 1 and 600);

create table if not exists "court_members" (
  "id" uuid primary key default gen_random_uuid(),
  "event_id" uuid not null references "events"("id") on delete cascade,
  "kind" varchar(16) not null,
  "name" varchar(120) not null,
  "whatsapp" varchar(20),
  "sponsors" varchar(200),
  "size" varchar(20),
  "confirmed" boolean not null default false,
  "budget_item_id" uuid references "budget_items"("id") on delete set null,
  "created_at" timestamp with time zone not null default now()
);
create index if not exists "court_members_event_idx" on "court_members" ("event_id");
alter table "court_members" drop constraint if exists "court_members_kind_check";
alter table "court_members" add constraint "court_members_kind_check" check ("kind" in ('padrino', 'dama', 'caballero', 'chambelan', 'corte'));

create table if not exists "rehearsals" (
  "id" uuid primary key default gen_random_uuid(),
  "event_id" uuid not null references "events"("id") on delete cascade,
  "date" timestamp with time zone not null,
  "place" varchar(120),
  "notes" text,
  "created_at" timestamp with time zone not null default now()
);
create index if not exists "rehearsals_event_idx" on "rehearsals" ("event_id");

create table if not exists "rehearsal_attendees" (
  "rehearsal_id" uuid not null references "rehearsals"("id") on delete cascade,
  "court_member_id" uuid not null references "court_members"("id") on delete cascade,
  primary key ("rehearsal_id", "court_member_id")
);
