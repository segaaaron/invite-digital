-- Porteros: la gente de la puerta que suma quien compró, sin cuenta.
--
-- El enlace y el PIN viven solo como hash. El portero pertenece a un evento y cae con él
-- (`cascade`); quien lo sumó es procedencia (`set null`), como en la auditoría.
create table if not exists "door_porters" (
  "id" uuid primary key default gen_random_uuid(),
  "event_id" uuid not null references "events"("id") on delete cascade,
  "name" varchar(80) not null,
  "phone" varchar(32),
  "gate" varchar(40),
  "token_hash" bytea not null unique,
  "pin_hash" bytea not null,
  "failed_attempts" integer not null default 0,
  "locked_until" timestamp with time zone,
  "opens_hours_before" integer not null default 6,
  "closes_hours_after" integer not null default 4,
  "created_by_user_id" uuid references "users"("id") on delete set null,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone not null default now()
);
create index if not exists "door_porters_event_idx" on "door_porters" ("event_id");

-- Quién registró cada llegada: `porter:<id>` o `user:<id>`. Texto y no clave foránea: el
-- registro es append-only y sobrevive a quitar al portero.
alter table "arrivals" add column if not exists "recorded_by" varchar(120);

-- Cuántos porteros trae cada plan. Los planes existentes reciben 0 / 3 / 10.
alter table "plans" add column if not exists "max_door_porters" integer not null default 0;
update "plans" set "max_door_porters" = case "slug" when 'firma-3d' then 3 when 'alta-costura' then 10 else 0 end
  where "max_door_porters" = 0;
