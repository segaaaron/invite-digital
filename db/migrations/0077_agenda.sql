-- La agenda del evento (29 de septiembre): las citas que no son tarea, pago ni momento —la prueba del
-- vestido, la degustación, la reunión con el fotógrafo— y la suscripción `.ics` de cada persona.
create table if not exists event_appointments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  title varchar(200) not null,
  -- Hora de Bolivia sin zona, como el resto del planner: `2026-11-03T16:30`.
  starts_at varchar(16) not null,
  duration_min integer not null default 60,
  place varchar(200),
  vendor_id uuid references vendors(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);
alter table event_appointments drop constraint if exists event_appointments_duration_check;
alter table event_appointments add constraint event_appointments_duration_check check (duration_min between 5 and 1440);
create index if not exists event_appointments_event_idx on event_appointments (event_id, starts_at);

-- Un enlace privado por persona y evento. Del token solo vive su SHA-256; regenerarlo invalida el anterior.
create table if not exists calendar_feeds (
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  token_hash bytea not null unique,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
