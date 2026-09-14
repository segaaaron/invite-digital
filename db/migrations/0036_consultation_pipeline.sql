-- El seguimiento de las consultas de la web.
--
-- El formulario de contacto lleva guardando en `consultation_requests` desde el ciclo 1 y
-- **ninguna pantalla lo leía**: cada cliente que escribía se quedaba en la base sin que
-- nadie lo viera. Esto le da un embudo corto — nueva, contactada, ganada o perdida —.
--
-- `new` por defecto también para las que ya existen: nadie las ha atendido, y eso es
-- exactamente lo que dice.
alter table "consultation_requests" add column if not exists "status" varchar(16) not null default 'new';
alter table "consultation_requests" add column if not exists "note" text;
alter table "consultation_requests" add column if not exists "status_changed_at" timestamp with time zone;
alter table "consultation_requests" add column if not exists "event_id" uuid;

-- La boda que salió de la consulta. `SET NULL`: borrar la boda no borra que hubo una
-- venta. `add constraint` no admite `if not exists`, así que va precedido de su `drop`.
alter table "consultation_requests" drop constraint if exists "consultation_requests_event_id_events_id_fk";
alter table "consultation_requests"
  add constraint "consultation_requests_event_id_events_id_fk"
  foreign key ("event_id") references "events"("id") on delete set null;

-- La bandeja filtra por estado y ordena por llegada.
create index if not exists "consultation_requests_status_idx" on "consultation_requests" ("status", "created_at" desc);
