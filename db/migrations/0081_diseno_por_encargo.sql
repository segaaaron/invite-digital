-- El diseño por encargo: el cliente reserva, nos da sus datos y nosotros diseñamos. Una fila por
-- evento en `event_design` (sin fila: autoservicio, como siempre). Las rondas incluidas y los días
-- de entrega se copian del plan al empezar: editar el plan no cambia lo vendido.
alter table "plans" add column if not exists "correction_rounds" smallint;
alter table "plans" add column if not exists "delivery_days" smallint;
alter table "plans" drop constraint if exists "plans_correction_rounds_check";
alter table "plans" add constraint "plans_correction_rounds_check" check ("correction_rounds" is null or "correction_rounds" between 0 and 20);
alter table "plans" drop constraint if exists "plans_delivery_days_check";
alter table "plans" add constraint "plans_delivery_days_check" check ("delivery_days" is null or "delivery_days" between 1 and 60);

create table if not exists "event_design" (
  "event_id" uuid primary key references "events"("id") on delete cascade,
  "status" varchar(20) not null default 'esperando_datos',
  "rounds_included" smallint not null default 2,
  "rounds_used" smallint not null default 0,
  "delivery_days" smallint not null default 3,
  "due_date" date,
  "updated_at" timestamptz not null default now()
);
alter table "event_design" drop constraint if exists "event_design_status_check";
alter table "event_design" add constraint "event_design_status_check" check ("status" in ('esperando_datos', 'en_diseno', 'version_enviada', 'aprobada'));

-- Cada ronda es un mensaje del cliente con todos sus cambios. `counts = false`: error nuestro.
create table if not exists "design_rounds" (
  "id" uuid primary key default gen_random_uuid(),
  "event_id" uuid not null references "events"("id") on delete cascade,
  "message" text not null,
  "counts" boolean not null default true,
  "created_by" uuid references "users"("id") on delete set null,
  "created_at" timestamptz not null default now()
);
create index if not exists "design_rounds_event_idx" on "design_rounds" ("event_id", "created_at");
