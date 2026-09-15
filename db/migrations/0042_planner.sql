-- El planner: plan de tareas y presupuesto de cada evento.
--
-- Todo cae con su evento (`cascade`). Los importes van en centavos enteros. Quién cerró una
-- tarea se copia como texto, como en la auditoría: sobrevive a quitar a esa persona.
create table if not exists "planner_tasks" (
  "id" uuid primary key default gen_random_uuid(),
  "event_id" uuid not null references "events"("id") on delete cascade,
  "stage" varchar(24) not null,
  "title" varchar(200) not null,
  "due_date" date,
  "assignee" varchar(16) not null default 'anfitrion',
  "notes" text,
  "done_at" timestamp with time zone,
  "done_by" varchar(255),
  "sort_order" integer not null default 0,
  "created_at" timestamp with time zone not null default now()
);
create index if not exists "planner_tasks_event_idx" on "planner_tasks" ("event_id", "sort_order");
alter table "planner_tasks" drop constraint if exists "planner_tasks_assignee_check";
alter table "planner_tasks" add constraint "planner_tasks_assignee_check" check ("assignee" in ('anfitrion', 'planner', 'familia'));

create table if not exists "budget_items" (
  "id" uuid primary key default gen_random_uuid(),
  "event_id" uuid not null references "events"("id") on delete cascade,
  "category" varchar(32) not null,
  "concept" varchar(160) not null,
  "estimated_cents" integer not null default 0,
  "contracted_cents" integer,
  "payer" varchar(16) not null default 'anfitriones',
  "padrino_label" varchar(120),
  "notes" text,
  "created_at" timestamp with time zone not null default now()
);
create index if not exists "budget_items_event_idx" on "budget_items" ("event_id");
alter table "budget_items" drop constraint if exists "budget_items_amounts_check";
alter table "budget_items" add constraint "budget_items_amounts_check" check ("estimated_cents" >= 0 and ("contracted_cents" is null or "contracted_cents" >= 0));
alter table "budget_items" drop constraint if exists "budget_items_payer_check";
alter table "budget_items" add constraint "budget_items_payer_check" check ("payer" in ('anfitriones', 'familia_a', 'familia_b', 'padrino', 'otro'));

create table if not exists "budget_payments" (
  "id" uuid primary key default gen_random_uuid(),
  "item_id" uuid not null references "budget_items"("id") on delete cascade,
  "amount_cents" integer not null,
  "due_date" date,
  "paid_at" timestamp with time zone,
  "created_at" timestamp with time zone not null default now()
);
create index if not exists "budget_payments_item_idx" on "budget_payments" ("item_id");
alter table "budget_payments" drop constraint if exists "budget_payments_amount_check";
alter table "budget_payments" add constraint "budget_payments_amount_check" check ("amount_cents" > 0);
