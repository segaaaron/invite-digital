-- Personal de puerta: quién puede registrar llegadas en qué evento.
--
-- Es una **pertenencia**, no un dato: `cascade` por los dos lados. Borrado el evento o el
-- usuario, el permiso no significa nada. Lo que nunca cae en cascada son los datos —los
-- eventos de un usuario van con `restrict`, y eso no cambia.
--
-- Reaplicable: toda migración escrita a mano tiene que poder correrse dos veces.
create table if not exists event_staff (
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index if not exists event_staff_user_idx on event_staff (user_id);
