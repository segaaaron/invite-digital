-- El presupuesto total del evento y su reparto por categorías.
create table if not exists "budget_plans" (
  "event_id" uuid primary key references "events"("id") on delete cascade,
  "total_cents" integer not null,
  "allocations" jsonb not null default '{}'::jsonb,
  "updated_at" timestamp with time zone not null default now()
);
alter table "budget_plans" drop constraint if exists "budget_plans_total_check";
alter table "budget_plans" add constraint "budget_plans_total_check" check ("total_cents" >= 0);
